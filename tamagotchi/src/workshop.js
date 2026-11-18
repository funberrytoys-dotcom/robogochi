'use strict';

// Two short outings. All hit targets are real buttons; the illustration follows the game state.
const Workshop = (() => {
  const SIZE = 340;
  const BOARD = { x: 44, y: 43, cell: 84 };
  const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const ROUTES = [[3, 4, 5], [6, 7, 4, 5], [3, 0, 1, 4, 7, 8]];
  const NAMES = { rail: 'Почтовый экспресс', bloom: 'Лунная теплица' };
  const POTS = [78, 170, 262];
  const PETALS = ['#ff9f92', '#a3c5ff', '#f8bc5c'];
  const q = (sel) => scene.panel.querySelector(sel);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function roundBox(g, x, y, w, h, r, color) {
    g.fillStyle = color; g.beginPath(); rrect(g, x, y, w, h, r); g.fill();
  }
  function oval(g, x, y, rx, ry, color, angle = 0) {
    g.fillStyle = color; g.beginPath(); ell(g, x, y, rx, ry, angle); g.fill();
  }
  function line(g, points, color, width) {
    g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(...points[0]);
    for (const pt of points.slice(1)) g.lineTo(...pt);
    g.stroke();
  }
  function star(g, x, y, r, color) {
    g.fillStyle = color; g.beginPath(); starPath(g, x, y, r, r * .32, 4); g.fill();
  }
  function envelope(g, x, y, scale, angle = 0) {
    g.save(); g.translate(x, y); g.rotate(angle); g.scale(scale, scale);
    roundBox(g, -16, -10, 32, 22, 3, '#694d40');
    roundBox(g, -15, -10, 30, 19, 2, '#fff5cc');
    line(g, [[-14, -8], [0, 1], [14, -8]], '#b78358', 1.5);
    roundBox(g, 6, -7, 6, 5, 1, '#ec7761');
    g.restore();
  }
  function fir(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    oval(g, 1, 5, 13, 4, '#65a189');
    roundBox(g, -2.4, -6, 4.8, 13, 1.8, '#895c42');
    for (let i = 0; i < 2; i++) {
      const size = 13 - i * 3, h = -i * 9;
      g.fillStyle = i ? '#5a9b76' : '#49856b'; g.beginPath();
      g.moveTo(0, h - 21); g.quadraticCurveTo(size * .5, h - 12, size, h - 2);
      g.quadraticCurveTo(0, h + 4, -size, h - 2); g.closePath(); g.fill();
    }
    g.restore();
  }
  function trackPoint(tile, t, turns = tile.turns) {
    const a = DIRECTIONS[tile.a], b = DIRECTIONS[tile.b], k = BOARD.cell / 2;
    // Quadratic curve through the centre, rotated around the tile pivot.
    const x = k * ((1 - t) ** 2 * a[0] + t ** 2 * b[0]);
    const y = k * ((1 - t) ** 2 * a[1] + t ** 2 * b[1]);
    const dx = t * b[0] - (1 - t) * a[0], dy = t * b[1] - (1 - t) * a[1];
    const alpha = turns * Math.PI / 2;
    return { x: tile.x + x * Math.cos(alpha) - y * Math.sin(alpha), y: tile.y + x * Math.sin(alpha) + y * Math.cos(alpha), a: Math.atan2(dy, dx) + alpha };
  }
  function drawTrack(g, tile) {
    const points = [];
    for (let n = 0; n <= 16; n++) points.push(trackPoint(tile, n / 16, tile.display));
    for (let i = 1; i < points.length; i += 3) {
      const p = points[i], nx = -Math.sin(p.a), ny = Math.cos(p.a);
      line(g, [[p.x - nx * 8, p.y - ny * 8], [p.x + nx * 8, p.y + ny * 8]], '#a4714d', 4);
    }
    for (const side of [-1, 1]) {
      const path = points.map((p) => [p.x - Math.sin(p.a) * side * 5, p.y + Math.cos(p.a) * side * 5]);
      line(g, path, '#4d625f', 3.5);
      line(g, path.map(([x, y]) => [x, y - .7]), '#ece5c5', 1.5);
    }
  }
  function train(g, x, y, angle, t) {
    g.save(); g.translate(x, y); g.rotate(angle);
    oval(g, 1, 1, 18, 10, '#48574752');
    roundBox(g, -13, -9, 25, 18, 4, '#375052');
    roundBox(g, -14, -11, 11, 22, 3, '#d56942');
    roundBox(g, -12, -8, 8, 16, 2, '#ffe2a2');
    roundBox(g, -2, -7.5, 14, 15, 4, '#e16d4b');
    roundBox(g, 1, -7.5, 3, 15, 1, '#ffc868');
    oval(g, 10, 0, 4.5, 4.5, '#415057');
    for (let i = 0; i < 3; i++) {
      const f = (t * .75 + i / 3) % 1;
      oval(g, 10 - f * 14, -f * 15, 2 + 3 * f, 2 + 3 * f, 'rgba(255,255,239,' + (1 - f) * .85 + ')');
    }
    g.restore();
  }
  function railArt(g, s) {
    const b = BOARD;
    const sky = g.createLinearGradient(0, 0, 0, SIZE);
    sky.addColorStop(0, '#b7e4d5'); sky.addColorStop(1, '#75b495');
    g.fillStyle = sky; g.fillRect(0, 0, SIZE, SIZE);
    g.save(); g.strokeStyle = '#fff5cb75'; g.lineWidth = 1.4; g.setLineDash([3, 6]);
    g.beginPath(); g.moveTo(-10, 23); g.bezierCurveTo(120, 65, 129, -25, 183, 22); g.bezierCurveTo(213, 43, 240, 6, 274, 11); g.stroke(); g.restore();
    envelope(g, 225, 17, .67, -.18);
    for (const [x, y, size] of [[13,35,.73],[30,44,.56],[320,32,.83],[307,43,.64],[35,323,.64],[20,318,.90],[310,315,.75],[327,328,.9]]) fir(g, x, y, size);
    const start = s.tiles[0], end = s.tiles[s.tiles.length - 1];
    line(g, [[10, start.y], [b.x, start.y]], '#646d60', 8);
    line(g, [[b.x + b.cell * 3, end.y], [325, end.y]], '#646d60', 8);
    for (let i = 0; i < 9; i++) {
      const x = b.x + i % 3 * b.cell, y = b.y + Math.floor(i / 3) * b.cell;
      const tile = s.tiles.find(v => v.id === i);
      roundBox(g, x + 1, y + 3, b.cell - 2, b.cell - 1, 10, '#6e9d80');
      roundBox(g, x + 1, y, b.cell - 2, b.cell - 3, 10, tile ? (tile.edit ? '#ffeab2' : '#e0dfba') : (i % 2 ? '#aad1aa' : '#b7d7a9'));
      if (!tile) {
        if (i % 2) {
          fir(g, x + 31, y + 52, .8); fir(g, x + 51, y + 56, 1.06);
        } else {
          oval(g, x + 40, y + 42, 22, 10, '#88bcb0', -.2);
          oval(g, x + 39, y + 41, 15, 6, '#a5d9cd', -.2);
          line(g, [[x + 34,y + 39],[x + 46,y + 37]], '#d6edd4', 2);
        }
        continue;
      }
      drawTrack(g, tile);
      if (tile.edit && !s.transition) {
        const cx = x + b.cell - 13, cy = y + b.cell - 15;
        oval(g, cx, cy, 8, 8, '#427165');
        g.lineWidth = 1.5; g.strokeStyle = '#fff9df'; g.beginPath(); g.arc(cx, cy, 4, -2.6, 1.3); g.stroke();
        line(g, [[cx + 1,cy + 2],[cx + 1,cy + 4],[cx + 4,cy + 4]], '#fff9df', 1.3);
        if (s.hint === i) {
          g.strokeStyle = '#dd7147'; g.lineWidth = 4; g.beginPath(); rrect(g, x + 4, y + 3, b.cell - 8, b.cell - 10, 8); g.stroke();
        }
      }
    }
    // Red mailbox marks the far end of the route.
    roundBox(g, 316, end.y + 4, 4, 13, 1, '#685b4a');
    roundBox(g, 306, end.y - 17, 25, 24, 7, '#b75447');
    roundBox(g, 308, end.y - 16, 19, 19, 5, '#ec7963');
    roundBox(g, 312, end.y - 10, 12, 3, 1.5, '#684849');
    const pct = s.transition ? clamp(s.elapsed / s.duration, 0, 1) : 0;
    const n = s.tiles.length, journey = pct * (n + 1) - .5;
    let p;
    if (journey < 0) p = { x: lerp(19, b.x, (journey + .5) * 2), y: start.y, a: 0 };
    else if (journey >= n) p = { x: lerp(b.x + 3 * b.cell, 315, (journey - n) * 2), y: end.y, a: 0 };
    else p = trackPoint(s.tiles[Math.floor(journey)], journey % 1, 0);
    train(g, p.x, p.y, p.a, s.t);
    if (s.transition && pct > .78) envelope(g, 307, end.y - 29 - Math.sin((pct - .78) / .22 * Math.PI) * 14, .8, -.14);
  }

  function drop(g, x, y, scale) {
    g.save(); g.translate(x, y); g.scale(scale, scale);
    g.beginPath(); g.moveTo(0, -9); g.bezierCurveTo(1,-5,7,-1,7,4); g.bezierCurveTo(7,13,-7,13,-7,4); g.bezierCurveTo(-7,0,-1,-6,0,-9);
    g.fillStyle = '#83e4ef'; g.fill(); oval(g, -1.8, 2.5, 1.6, 3, '#e6ffff', .3);
    g.restore();
  }
  function flower(g, x, y, k, i, t) {
    g.save(); g.translate(x, y);
    const height = 33 + 26 * k;
    const sway = Math.sin(t * 1.3 + i) * (1 + k * 2.3);
    line(g, [[0, 0],[sway, -height]], '#88bd8c', 5);
    oval(g, -8, -13, 13, 5.5, '#7acda0', .48);
    oval(g, 8, -24, 13, 5.5, '#a6dc9a', -.5);
    g.translate(sway, -height);
    if (k < .04) {
      // Three folded petals meet in a taper. The wide petals only appear after watering.
      oval(g, -2, -2, 4.5, 10, PETALS[i], -.35);
      oval(g, 2, -2, 4.5, 10, PETALS[i], .35);
      oval(g, 0, -3, 3.7, 10, lighten(PETALS[i], .27));
      oval(g, -3, 4, 5, 2.8, '#a0c98e', .6);
      oval(g, 3, 4, 5, 2.8, '#a0c98e', -.6);
      g.restore();
      return;
    }
    for (let j = 0; j < 7; j++) {
      g.save(); g.rotate(j * TAU / 7 + .08 * Math.sin(t + i));
      oval(g, 0, -(6 + k * 10), 3.8 + 4 * k, 7 + 6 * k, PETALS[i]); g.restore();
    }
    oval(g, 0, 0, 6 + 5 * k, 6 + 5 * k, '#ffd472');
    if (k > .3) {
      oval(g, -4, 0, 1.3, 1.7, '#63514d'); oval(g, 4, 0, 1.3, 1.7, '#63514d');
      g.strokeStyle = '#805753'; g.lineWidth = 1.3; g.beginPath(); g.arc(0,1.5,2.5,.1,Math.PI-.1); g.stroke();
    }
    g.restore();
  }
  function gardenArt(g, s) {
    const sky = g.createLinearGradient(0, 0, 0, SIZE);
    sky.addColorStop(0, '#2b3454'); sky.addColorStop(.68, '#36556a'); sky.addColorStop(1, '#233d48');
    g.fillStyle = sky; g.fillRect(0,0,SIZE,SIZE);
    // Ribbed glasshouse roof and a crescent hung above the shelves.
    line(g, [[-15,85],[170,7],[355,85]], '#758fa0', 4);
    for (const x of [29,109,231,311]) line(g, [[x,300],[x,Math.abs(170-x)*.42+8]], '#61798a80', 3);
    oval(g, 273, 60, 21, 21, '#ffdd90'); oval(g, 282, 53, 18, 18, '#303c58');
    for (let i = 0; i < 24; i++) {
      const x = (i * 71 + 17) % 335, y = (i * 31 + 14) % 181;
      const glow = .5 + Math.sin(s.t * 1.5 + i) * .32;
      star(g, x, y, 1.2 + i % 3, 'rgba(255,239,173,' + glow + ')');
    }
    roundBox(g, 12, 286, 316, 12, 4, '#b08070'); roundBox(g, 18, 295, 304, 5, 2, '#705b60');
    for (const x of [30,301]) roundBox(g, x,298,10,42,2,'#6a5960');
    const target = POTS[s.target], wet = s.transition && s.hit && !s.done;
    const travel = s.transition ? clamp(s.elapsed / .48, 0, 1) : 0;
    const width = s.radius;
    if (!s.done) {
    const glow = g.createLinearGradient(0, 118, 0, 250); glow.addColorStop(0, '#ffde9200'); glow.addColorStop(1, '#ffdf923a');
    g.fillStyle = glow; g.fillRect(target - width,118,width*2,130);
    line(g, [[target-width,153],[target-width,239]], '#f9e9ac72', 1.4);
    line(g, [[target+width,153],[target+width,239]], '#f9e9ac72', 1.4);
    }
    for (let i = 0; i < POTS.length; i++) {
      const x = POTS[i], active = i === s.target && !s.done;
      const k = s.grown.includes(i) ? 1 : (active && wet ? easeOut(clamp((s.elapsed - .43) / .58,0,1)) : 0);
      if (active) oval(g,x,286,33,5,'#fff3ab');
      flower(g,x,251,k,i,s.t);
      g.beginPath(); g.moveTo(x-23,255); g.lineTo(x+23,255); g.lineTo(x+18,282); g.quadraticCurveTo(x,289,x-18,282); g.closePath(); g.fillStyle = ['#d48275','#ac92c3','#c99e7e'][i]; g.fill();
      roundBox(g,x-26,248,52,10,4,['#eca197','#c8b1dc','#e8bd95'][i]);
      if (active) star(g, x, 269, 7, '#fff7c9');
      else if (k > .95) { line(g, [[x-5,269],[x-1,273],[x+6,266]], '#ffedc9', 2.3); }
    }
    const cx = s.cloudX, cy = 93;
    g.save(); g.translate(cx, cy);
    const bob = Math.sin(s.t * 2.2) * 2; g.translate(0, bob);
    oval(g,0,7,32,12,'#a4b7d4'); oval(g,-18,1,16,14,'#e1ebf6');
    oval(g,0,-6,20,18,'#e5f1f9'); oval(g,17,1,16,14,'#d2e2f2');
    roundBox(g,-24,0,50,14,6,'#dbe8f4');
    oval(g,-7,2,1.8,2.5,'#53637c'); oval(g,7,2,1.8,2.5,'#53637c');
    oval(g,-12,6,3,1.7,'#efaeb6'); oval(g,12,6,3,1.7,'#efaeb6');
    g.restore();
    if (!s.transition) drop(g,cx,cy + 29 + Math.sin(s.t*3)*2,.66);
    else if (travel < 1) drop(g,cx,lerp(cy+29,250,travel*travel),.7+travel*.2);
    else if (!s.done) {
      for (let i=0;i<8;i++) {
        const a = TAU*i/8, f = clamp((s.elapsed - .48) / .43,0,1);
        star(g,cx+Math.cos(a)*f*27,235+Math.sin(a)*f*14,3*(1-f),s.hit?'#faffbe':'#9ae8ee');
      }
    }
  }

  function getSide(id, neighbor) {
    const dx = neighbor % 3 - id % 3, dy = Math.floor(neighbor / 3) - Math.floor(id / 3);
    return DIRECTIONS.findIndex(([x,y]) => x === dx && y === dy);
  }
  function correct(tile) {
    return tile.turns % (Math.abs(tile.a - tile.b) === 2 ? 2 : 4) === 0;
  }

  const scene = {
    name: 'workshop',
    open(kind) {
      if (!Object.hasOwn(NAMES, kind)) return;
      Snd.init(); Snd.Music.stop();
      if (World.washing) Room.cancelWash();
      if (Room.robot.mode === 'sleep') Room.wake(true);
      Game.setScene(this, kind);
    },
    enter(kind) {
      this.kind = kind; this.round = 0; this.t = 0; this.errors = 0; this.done = false;
      this.flip = Math.random() < .5; this.grown = [];
      this.rewardRobot = kind === 'rail' ? 'gudok' : 'lutik';
      this.ownedAtStart = Boolean(Game.s.unlocked[this.rewardRobot]);
      this.order = [0,1,2];
      for (let i = 2; i > 0; i--) { const j = randi(0,i); [this.order[i], this.order[j]] = [this.order[j], this.order[i]]; }
      const panel = document.createElement('section');
      panel.className = 'ws-game ws-' + kind;
      panel.setAttribute('aria-label', NAMES[kind]);
      panel.innerHTML = '<div class="ws-top"><button class="ws-back" aria-label="Вернуться домой">←</button><div class="ws-count" aria-hidden="true"></div></div><div class="ws-heading"><canvas class="ws-mate" aria-hidden="true"></canvas><div><h2></h2><p class="ws-progress"></p></div></div><div class="ws-playfield"><canvas class="ws-art" aria-hidden="true"></canvas></div><div class="ws-bottom"><p class="ws-say" aria-live="polite"></p><div class="ws-keys"></div></div>';
      this.panel = panel; stage.append(panel);
      this.canvas = q('.ws-art'); this.graphics = this.canvas.getContext('2d');
      this.mate = q('.ws-mate'); this.mate.width = 144; this.mate.height = 152;
      this.mateGraphics = this.mate.getContext('2d'); this.pose = defaultPose();
      q('h2').textContent = NAMES[kind]; q('.ws-back').onclick = () => this.exit();
      this.next(); q('.ws-back').focus({ preventScroll: true });
    },
    say(text) { q('.ws-say').textContent = text; },
    status() {
      q('.ws-count').innerHTML = [0,1,2].map((n) => '<i class="ws-token ' + (this.done || n < this.round ? 'is-done' : n === this.round ? 'is-now' : '') + '"></i>').join('');
      q('.ws-progress').textContent = this.done ? 'Все три задания готовы!' : (this.kind === 'rail' ? 'Письмо ' : 'Цветок ') + (this.round+1) + ' из 3';
    },
    next() {
      this.transition = false; this.elapsed = 0; this.hint = -1;
      this.status();
      if (this.kind === 'rail') this.railRound();
      else this.gardenRound();
    },
    railRound() {
      const route = ROUTES[this.round].map(id => this.flip ? (2 - Math.floor(id / 3)) * 3 + id % 3 : id);
      this.tiles = route.map((id,i) => ({
        id, a: i ? getSide(id,route[i-1]) : 3, b: i < route.length-1 ? getSide(id,route[i+1]) : 1,
        x: BOARD.x+(id%3+.5)*BOARD.cell, y: BOARD.y+(Math.floor(id/3)+.5)*BOARD.cell,
        turns: 0, display: 0, edit: false
      }));
      const candidates = this.tiles.slice();
      for (let i=0; i<=this.round; i++) {
        const [tile] = candidates.splice(randi(0,candidates.length-1),1);
        const straight = Math.abs(tile.a-tile.b) === 2;
        tile.edit = true; tile.turns = straight ? 1 : randi(1,3); tile.display = tile.turns;
      }
      this.panel.querySelectorAll('.ws-tile').forEach(b => b.remove());
      for (const tile of this.tiles.filter(v => v.edit)) {
        const b = document.createElement('button');
        b.className='ws-tile'; b.setAttribute('aria-label','Повернуть рельсы. Ряд ' + (Math.floor(tile.id/3)+1) + ', столбец ' + (tile.id%3+1));
        b.style.left = (tile.x-BOARD.cell/2)/SIZE*100+'%'; b.style.top = (tile.y-BOARD.cell/2)/SIZE*100+'%';
        b.style.width = b.style.height = BOARD.cell/SIZE*100+'%';
        b.onclick = () => this.turn(tile); q('.ws-playfield').append(b);
      }
      this.say('Поверни жёлтые плитки. Поезд ждёт дорогу к почтовому ящику.');
      q('.ws-keys').innerHTML = '<button class="ws-hint">Где повернуть?</button>';
      q('.ws-hint').onclick = () => {
        if (this.transition) return;
        this.hint = this.tiles.find(t => !correct(t)).id;
        this.say('Поверни плитку в оранжевой рамке.'); Snd.sfx.pop(.75);
      };
    },
    turn(tile) {
      if (this.done || this.transition) return;
      tile.turns++; this.hint = -1;
      Snd.noise({dur:.065, f:1650, f1:790, vol:.065});
      Snd.osc({type:'triangle',f0:320,f1:425,dur:.09,vol:.065});
      if (this.tiles.every(correct)) {
        this.transition = true; this.elapsed = 0; this.duration = reducedMotion.matches ? .8 : 1.75;
        q('.ws-hint').disabled = true;
        this.panel.querySelectorAll('.ws-tile').forEach(b=>b.disabled=true);
        this.say('Ту-ту! Письмо едет!');
        Snd.osc({f0:640,f1:820,dur:.22,vol:.095}); Snd.osc({f0:655,f1:900,dur:.3,at:.27,vol:.09});
      }
    },
    gardenRound() {
      this.target=this.order[this.round]; this.misses=0;
      this.radius=[34,28,23][this.round]; this.phase=rand(TAU); this.cloudX=170+Math.sin(this.phase)*122;
      const where=['левым','средним','правым'][this.target];
      this.say('Полей горшок со звездой. Нажми, когда тучка над '+where+' цветком.');
      q('.ws-keys').innerHTML='<button class="ws-big ws-water">Капнуть</button>';
      q('.ws-water').onclick=()=>this.water();
    },
    water() {
      if (this.done || this.transition) return;
      this.transition=true; this.elapsed=0; this.hit=Math.abs(this.cloudX-POTS[this.target])<=this.radius;
      this.duration=this.hit?1.2:.87; q('.ws-water').disabled=true;
      Snd.osc({f0:1250,f1:450,dur:.32,vol:.07}); Snd.noise({dur:.09,f:2700,f1:820,vol:.05,at:.32});
      if (this.hit) {
        [523,659,784].forEach((f,i)=>Snd.osc({type:'sine',f0:f,dur:.23,at:.41+i*.1,vol:.07}));
        this.say('Цветок распускается!');
      } else {
        this.misses++; this.errors++; this.radius=Math.min(42,this.radius+4);
        this.say('Капелька мимо. Тучка летит медленнее!');
      }
    },
    delivered() {
      const stat = this.kind==='rail' ? 'lettersDelivered' : 'flowersGrown';
      Game.stat(stat);
      if (this.kind==='bloom') this.grown.push(this.target);
      if (this.round<2) {
        Game.save(); this.round++; this.next();
      } else {
        this.done=true; this.status();
        const bolts=this.kind==='rail'?7:Math.max(4,7-Math.min(3,this.errors));
        Game.s.bolts+=bolts; Game.s.stats.boltsTotal+=bolts;
        Game.checkUnlocks(); Game.need('fun',15); Game.friend(4); Game.save();
        Snd.sfx.fanfare();
        const found = !this.ownedAtStart && Game.s.unlocked[this.rewardRobot];
        const success = this.kind === 'rail' ? 'Три письма доставлены!' : 'Все цветы раскрылись!';
        q('.ws-progress').textContent = '+' + bolts + ' винтиков · +4 опыта дружбы';
        this.say(found ? 'Новый друг в коллекции — ' + ROBOT_BY_ID[this.rewardRobot].name + '!' : success);
        q('.ws-keys').innerHTML='<button class="ws-big ws-again">Ещё раз</button><button class="ws-home">Домой</button>';
        q('.ws-again').onclick=()=>this.open(this.kind); q('.ws-home').onclick=()=>this.exit();
        q('.ws-again').focus({preventScroll:true});
      }
    },
    update(dt) {
      this.t+=dt;
      if (this.kind==='rail') {
        for (const tile of this.tiles) tile.display=reducedMotion.matches?tile.turns:damp(tile.display,tile.turns,19,dt);
      } else if (!this.transition && !this.done) {
        this.phase+=dt*(1.26+this.round*.18)/(1+Math.min(4,this.misses)*.3);
        this.cloudX=170+Math.sin(this.phase)*122;
      }
      if (!this.transition || this.done) return;
      this.elapsed+=dt;
      if (this.elapsed>=this.duration) {
        if (this.kind==='bloom' && !this.hit) {
          this.transition=false; q('.ws-water').disabled=false;
          this.say('Подожди, пока тучка окажется над звездой.');
        } else this.delivered();
      }
    },
    draw() {
      const g=this.graphics, c=this.canvas;
      const resolution=Math.max(1,Math.round(c.clientWidth*Math.min(devicePixelRatio || 1,2)));
      if (c.width!==resolution || c.height!==resolution) c.width=c.height=resolution;
      g.setTransform(resolution/SIZE,0,0,resolution/SIZE,0,0);
      if (this.kind==='rail') railArt(g,this); else gardenArt(g,this);

      const gotFriend = this.done && !this.ownedAtStart && Game.s.unlocked[this.rewardRobot];
      const friend = gotFriend ? ROBOT_BY_ID[this.rewardRobot] : Game.def;
      const mate = this.mateGraphics, pose = this.pose;
      mate.clearRect(0, 0, this.mate.width, this.mate.height);
      pose.x = 72; pose.y = 140; pose.px = 75; pose.t = this.t;
      pose.hat = gotFriend ? null : Game.s.hat;
      pose.expr = this.done || this.transition && (this.kind === 'rail' || this.hit) ? 'happy' : 'normal';
      pose.blink = this.t % 3.6 > 3.44 ? 0.85 : 0;
      pose.headRot = reducedMotion.matches ? 0 : Math.sin(this.t * 1.8) * .045;
      pose.lookX = this.kind === 'bloom' ? (this.cloudX - 170) / 122 * .6 : .35;
      pose.z = this.transition && !this.done && !reducedMotion.matches ? Math.abs(Math.sin(this.elapsed * 5)) * .045 : 0;
      drawRobot(mate, friend, pose);
    },
    exit() { if (Game.scene===this) { Snd.sfx.close(); Games.exit(); } },
    leave() { this.panel.remove(); this.panel=null; this.graphics=null; this.canvas=null; this.mate = null; this.mateGraphics = null; }
  };
  return scene;
})();
window.Workshop=Workshop;
