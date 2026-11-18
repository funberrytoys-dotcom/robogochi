'use strict';

// The parcel keeps its recipient and the fitted pieces across reloads.
const Parcel = (() => {
  const phases = ['letter', 'sleeve', 'seal', 'pull', 'parts', 'name'];
  const symbols = [
    { glyph: '★', label: 'Звезда' }, { glyph: '♥', label: 'Сердце' }, { glyph: 'ϟ', label: 'Молния' },
  ];
  const parts = ['Ножки', 'Корпус', 'Голова'];
  const headings = {
    letter: 'Тебе посылка!', sleeve: 'Что под обложкой?', seal: 'Секретный замок',
    pull: 'Тяни за кольцо!', parts: 'Собери малыша', name: 'Он ожил!',
  };
  let root, saved, def, busy, timer, drag, pieces, voiceTime, replay;

  function img(key, cls, alt = '') {
    const url = (window.PARCEL_ART || {})[key] || (key === 'logo' && window.LOGO_SRC);
    return url ? `<img class="${cls}" src="${url}" alt="${alt}" draggable="false">` : '';
  }
  function shuffled(items) {
    const array = items.slice();
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  function save() { if (!replay) Game.save(); }
  function seek(phase) {
    saved.phase = phase;
    save();
    render(true);
  }
  function waitForMotion(ms, next) {
    busy = true;
    timer = setTimeout(() => { busy = false; if (root) next(); }, ms);
  }
  function action(label, code) {
    return `<button class="rp-action" data-act="${code}">${label}<span aria-hidden="true">→</span></button>`;
  }
  function describe() {
    const p = saved.phase;
    if (p === 'seal') return 'Нажми значки в порядке на записке.';
    if (p === 'pull') return 'Сдвинь крышку вправо или нажми на кольцо.';
    if (p === 'sleeve') return 'Сдвинь бумажную обложку вправо.';
    if (p === 'parts') return 'Найди деталь для светящегося места.';
    if (p === 'name') return replay ? 'Друг собран и готов играть.' : 'Как ты назовёшь своего робота?';
    return 'Из мастерской Чико';
  }
  function station() {
    const step = ['letter','sleeve','seal','pull'].includes(saved.phase) ? 0 : saved.phase === 'parts' ? 1 : 2;
    return `<div class="rp-route" aria-label="Шаг ${step + 1} из 3">${['Посылка','Сборка','Знакомство'].map((s,i) =>
      `<span class="${i === step ? 'rp-current' : ''} ${i < step ? 'rp-done' : ''}"><i aria-hidden="true">${i < step ? '✓' : ''}</i>${s}</span>`).join('')}</div>`;
  }
  function container() {
    const p = saved.phase;
    const wrapped = p === 'letter' || p === 'sleeve';
    return `<div class="rp-display">
      <div class="rp-print" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="rp-object">
        <div class="rp-cast"></div><div class="rp-tin">
          <div class="rp-wall"></div><div class="rp-well">${p === 'pull' ? '<canvas data-loose="2" width="156" height="136"></canvas><canvas data-loose="1" width="120" height="90"></canvas><canvas data-loose="0" width="120" height="84"></canvas>' : ''}</div>
          <div class="rp-lid">
            <div class="rp-ridges"><i></i><i></i><i></i></div>
            <div class="rp-tabs" ${p === 'seal' ? '' : 'hidden'}>${[2,0,1].map(i => {
              const done = saved.code.slice(0,saved.seals).includes(i);
              return `<button data-symbol="${i}" aria-label="${symbols[i].label}" aria-pressed="${done}" ${done ? 'disabled' : ''}>${symbols[i].glyph}</button>`;
            }).join('')}</div>
            ${p === 'pull' ? '<button type="button" class="rp-ring" data-act="pull" aria-label="Потянуть кольцо"></button>' : '<div class="rp-ring" aria-hidden="true"></div>'}
          </div>
          ${wrapped ? `<div class="rp-sleeve" ${p === 'sleeve' ? 'data-slide="sleeve"' : ''}>${img('sleeve','rp-sleeve-art','Бумажная обложка ToysBerry с Чико')}</div>` : ''}
        </div>
      </div>
      ${p === 'letter' ? '<span class="rp-chirp" aria-hidden="true">Пи-пи!</span>' : ''}
    </div>`;
  }
  function note() {
    const p = saved.phase;
    if (p === 'letter') return `<aside class="rp-note"><i class="rp-tape"></i><div><b>Привет, друг!</b><p>В банке спрятался малыш-робот. Собери его и научи первому слову!</p><em>Твой Чико</em></div>${img('chiko','rp-chiko')}</aside>${action('Распаковать','letter')}`;
    if (p === 'seal') return `<div class="rp-code"><b>Код Чико</b><div aria-label="Код: ${saved.code.map(i=>symbols[i].label).join(', ')}">${saved.code.map((id,i)=>`<span class="${i < saved.seals ? 'rp-used' : ''} ${i === saved.seals ? 'rp-next' : ''}">${symbols[id].glyph}</span>`).join('<small aria-hidden="true">›</small>')}</div></div>`;
    if (p === 'sleeve') return action('Снять обложку','sleeve');
    if (p === 'pull') return action('Открыть банку','pull');
    if (p === 'parts') return `<div class="rp-part-label">Нужная деталь <strong>${parts[saved.fitted].toLowerCase()}</strong></div><div class="rp-pieces">${saved.order.map(i=>
      `<button data-piece="${i}" ${i < saved.fitted ? 'disabled' : ''}><canvas width="136" height="96" aria-hidden="true"></canvas><b>${parts[i]}</b></button>`
    ).join('')}</div>`;
    if (replay) return action('Домой с другом','finish');
    return `<label class="rp-name">Имя робота<input name="robot-name" maxlength="12" autocomplete="off" spellcheck="false"></label>${action('Домой с другом','finish')}`;
  }
  function bench() {
    const isName = saved.phase === 'name';
    return `<div class="rp-bench ${isName ? 'rp-reveal' : ''}">
      <div class="rp-mat"><i></i><i></i><i></i><i></i>
      <canvas class="rp-plan" width="400" height="410" aria-label="${isName ? 'Собранный робот' : 'Схема сборки'}"></canvas>
      ${isName ? '<span class="rp-first-voice">Пи-и!</span>' : `<span class="rp-counter">Собрано · ${saved.fitted} / 3</span>`}
      </div></div>`;
  }
  function render(focus = false) {
    if (!root) return;
    const p = saved.phase, previous = root.dataset.phase;
    root.dataset.phase = p;
    root.innerHTML = `<div class="rp-page">
      <header class="rp-brand">${img('logo','rp-logo','ToysBerry')}${replay ? '<button class="rp-home" data-act="exit">Домой ↗</button>' : ''}<div class="rp-service"><span aria-hidden="true">✦</span> Робопочта</div></header>
      <div class="rp-heading"><h1 tabindex="-1">${headings[p]}</h1><p>${describe()}</p></div>
      ${p === 'parts' || p === 'name' ? bench() : container()}
      <div class="rp-controls"><div class="rp-feedback" role="status"></div>${note()}</div>
      ${station()}</div>`;
    root.querySelectorAll('[data-loose]').forEach(cv=>drawPiece(cv,Number(cv.dataset.loose)));
    if (p === 'parts' || p === 'name') {
      drawPlan(0);
      root.querySelectorAll('[data-piece]').forEach(button => {
        const i = Number(button.dataset.piece);
        drawPiece(button.querySelector('canvas'),i);
      });
    }
    if (p === 'name' && !replay) root.querySelector('input').value = saved.petName ?? def.name;
    if (focus && previous !== p) root.querySelector('h1').focus({ preventScroll:true });
  }
  function hint(message) {
    const el = root.querySelector('.rp-feedback');
    el.textContent = message;
    el.animate?.([{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:210});
  }
  function makeSprite() {
    const pose = defaultPose();
    Object.assign(pose,{x:200,y:383,px:188,shadow:false,headRot:0,turn:0,wing:0.22,expr:'normal'});
    const neck = Math.round(pose.y + (GEO.hipY+GEO.neckBase-GEO.neckLen)*pose.px)+2;
    const hip = Math.round(pose.y + (GEO.hipY+GEO.bodyCY+GEO.bodyRY)*pose.px);
    // Keep the beak and other protrusions with the head even when they overlap the belly.
    pieces = [[hip,410],[neck,hip],[0,410]].map(([top,bottom],i)=>{
      const layer=document.createElement('canvas'); layer.width=400; layer.height=410;
      const pen=layer.getContext('2d');
      if(i===2) {
        pen.save(); pen.translate(pose.x,pose.y+(GEO.hipY+GEO.neckBase-GEO.neckLen-def.head.h/2)*pose.px);
        pen.scale(pose.px,pose.px); drawHead(pen,def,pose,def.head.w,def.head.h,0.016); pen.restore();
      } else {
        pen.beginPath(); pen.rect(0,top,400,bottom-top); pen.clip();
        drawRobot(pen,def,{...pose,headY:-0.6});
      }
      const pixels=pen.getImageData(0,0,400,410).data;
      let xMin=399,xMax=0,yMin=bottom-1,yMax=top;
      for(let y=top;y<bottom;y++) for(let x=0;x<400;x++) if(pixels[(y*400+x)*4+3]>5){
        xMin=Math.min(xMin,x); xMax=Math.max(xMax,x); yMin=Math.min(yMin,y); yMax=Math.max(yMax,y);
      }
      return {layer,x:xMin,y:yMin,w:xMax-xMin+1,h:yMax-yMin+1};
    });
  }
  function drawPiece(canvas,i) {
    const box=pieces[i], w=canvas.width,h=canvas.height;
    const scale=Math.min((w-12)/box.w,(h-10)/box.h);
    canvas.getContext('2d').drawImage(box.layer,box.x,box.y,box.w,box.h,(w-box.w*scale)/2,(h-box.h*scale)/2,box.w*scale,box.h*scale);
  }

  function drawPlan(t) {
    const cv = root.querySelector('.rp-plan');
    if (!cv) return;
    const g = cv.getContext('2d'); g.clearRect(0,0,400,410);
    if (saved.phase === 'name') {
      const pose = defaultPose();
      Object.assign(pose,{x:200,y:383,px:188,t,turn:Math.sin(t*1.6)*0.33,headRot:0.055*Math.sin(t*2.4),wing:0.3+0.22*Math.sin(t*3),blink:Math.pow(Math.max(0,Math.cos(t*2)),38),breath:Math.sin(t*3),bill:Math.max(0,Math.sin(t*5))*0.3});
      drawRobot(g,def,pose); return;
    }
    for(let i=0;i<3;i++) {
      const box=pieces[i];
      g.save();
      if(i>=saved.fitted) {
        g.filter='brightness(0) invert(1)';
        g.globalAlpha=i === saved.fitted ? 0.65 : 0.18;
      }
      g.drawImage(box.layer,box.x,box.y,box.w,box.h,box.x,box.y,box.w,box.h);
      g.restore();
    }
  }
  function fit(i) {
    if (busy || saved.phase !== 'parts') return;
    if (i !== saved.fitted) { Snd.sfx.pop(0.65); hint(`Попробуй деталь «${parts[saved.fitted]}»`); return; }
    const tile=root.querySelector('[data-piece="'+i+'"] canvas'), plan=root.querySelector('.rp-plan');
    const from=tile.getBoundingClientRect(), to=plan.getBoundingClientRect(), box=pieces[i];
    const scale=Math.min(to.width/400,to.height/410);
    const targetX=to.left+to.width/2+(box.x+box.w/2-200)*scale;
    const targetY=to.top+to.height/2+(box.y+box.h/2-205)*scale;
    const flying=tile.cloneNode(); flying.className='rp-flying-piece';
    flying.getContext('2d').drawImage(tile,0,0);
    Object.assign(flying.style,{width:from.width+'px',height:from.height+'px',left:from.left+'px',top:from.top+'px'});
    document.body.appendChild(flying);
    const dx=targetX-from.left-from.width/2,dy=targetY-from.top-from.height/2;
    if (!matchMedia('(prefers-reduced-motion:reduce)').matches) {
      flying.animate?.([{opacity:1,transform:'scale(1.04)'},{opacity:0.8,transform:`translate(${dx}px,${dy}px) scale(.65)`}],{duration:265,easing:'ease-out',fill:'forwards'});
      setTimeout(()=>flying.remove(),270);
    } else flying.remove();
    saved.fitted++; Snd.sfx.servo(); Snd.sfx.tap([440,554,659][i]);
    if (saved.fitted === 3) {
      saved.phase = 'name'; save();
      drawPlan(0);
      waitForMotion(340, ()=>{ voiceTime=0; Snd.voice(def.voice,'hello'); render(true); });
    } else {
      save(); render(); root.querySelector('.rp-plan')?.animate?.([{transform:'scale(0.98)'},{transform:'scale(1)'}],{duration:260});
      root.querySelector('[data-piece]:not([disabled])')?.focus({preventScroll:true});
    }
  }
  function seal(i) {
    if (busy || saved.phase !== 'seal') return;
    if (i !== saved.code[saved.seals]) { Snd.sfx.pop(0.65); hint(`Найди значок «${symbols[saved.code[saved.seals]].label}»`); return; }
    Snd.sfx.tap([523,659,784][saved.seals]);
    saved.seals++;
    if (saved.seals === 3) { Snd.sfx.ding(); seek('pull'); }
    else { save(); render(); root.querySelector('[data-symbol]:not([disabled])')?.focus({preventScroll:true}); }
  }
  function perform(code) {
    if (busy) return;
    Snd.init();
    if (replay && (code === 'exit' || code === 'finish')) { Game.setScene(Room); return; }
    if (code === 'letter' && saved.phase === 'letter') { Snd.voice(def.voice,'question'); seek('sleeve'); }
    if (code === 'sleeve' && saved.phase === 'sleeve') {
      root.classList.add('rp-sliding'); Snd.sfx.whoosh();
      waitForMotion(450,()=>{ root.classList.remove('rp-sliding'); seek('seal'); });
    }
    if(code === 'pull' && saved.phase === 'pull') {
      root.classList.add('rp-opening'); Snd.sfx.servo(); Snd.sfx.ding();
      waitForMotion(930,()=>{ root.classList.remove('rp-opening'); seek('parts'); });
    }
    if(code === 'finish' && saved.phase === 'name') {
      busy = true;
      Game.s.robot = def.id; Game.s.name = root.querySelector('input').value.trim().slice(0,12) || def.name;
      Game.s.unlocked[def.id] = true; Game.s.started = true; saved.petName = Game.s.name;
      Game.save(); Room.setRobot(def); Snd.sfx.sparkle();
      root.classList.add('rp-depart');
      waitForMotion(290,()=>{ Game.setScene(Room); Room.robot.play(B.happyHop(Room.robot,2),2); Game.hint(); });
    }
  }
  function enter(options = {}) {
    replay=options.replay === true;
    saved=replay ? null : Game.s.parcel;
    if (!saved || !phases.includes(saved.phase) || !ROBOT_BY_ID[saved.robot]) {
      const robot = replay ? Game.def.id : pick(ROBOTS.filter(r=>r.access==='start')).id;
      saved={ robot, phase:'letter', code:shuffled([0,1,2]), seals:0, fitted:0, order:shuffled([0,1,2]) };
      if (!replay) Game.s.parcel=saved;
    }
     def=ROBOT_BY_ID[saved.robot]; busy=false; drag=null; voiceTime=0;
    save(); makeSprite();
    root=document.createElement('section'); root.className='rp-parcel'; root.setAttribute('aria-label','Посылка от ToysBerry'); stage.appendChild(root);
    root.addEventListener('click', e=>{
      const btn=e.target.closest('button');
      if(!btn || btn.disabled || busy) return;
      Snd.init();
      if(btn.dataset.act) perform(btn.dataset.act);
      else if(btn.dataset.symbol !== undefined) seal(Number(btn.dataset.symbol));
      else if(btn.dataset.piece !== undefined) fit(Number(btn.dataset.piece));
    });
    root.addEventListener('input', e=>{ if(e.target.name==='robot-name'){saved.petName=e.target.value; save();} });
    root.addEventListener('keydown',e=>{ if(e.key==='Enter' && e.target.name==='robot-name') perform('finish'); });
    root.addEventListener('pointerdown',e=>{
      const target=e.target.closest('[data-slide],.rp-ring[data-act],button[data-piece]:not([disabled])');
      if (!target || busy || !e.isPrimary) return;
      drag={target,x:e.clientX,y:e.clientY,id:e.pointerId};
      target.setPointerCapture(e.pointerId);
    });
    root.addEventListener('pointermove',e=>{
      if(!drag || drag.id!==e.pointerId) return;
      const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
      if(drag.target.hasAttribute('data-piece')) drag.target.style.transform=`translate(${dx}px,${dy}px) scale(1.03)`;
      else if(drag.target.hasAttribute('data-slide')) drag.target.style.setProperty('--rp-drag', Math.min(90,Math.max(0,dx))+'px');
    });
    root.addEventListener('pointerup',e=>{
      if(!drag || drag.id!==e.pointerId) return;
      const {target,x,y}=drag; drag=null;
      const dx=e.clientX-x, dy=e.clientY-y;
      target.style.removeProperty('transform'); target.style.removeProperty('--rp-drag');
      if(target.hasAttribute('data-piece') && Math.hypot(dx,dy)>12) {
        // Pointer capture preserves the touch, so decide by the physical drop point.
        const mat=root.querySelector('.rp-mat')?.getBoundingClientRect();
        const suppress=ev=>{ev.preventDefault();ev.stopImmediatePropagation();};
        target.addEventListener('click',suppress,{once:true,capture:true});
        setTimeout(()=>target.removeEventListener('click',suppress,true),80);
        if(mat && e.clientX>=mat.left && e.clientX<=mat.right && e.clientY>=mat.top && e.clientY<=mat.bottom) {Snd.init(); fit(Number(target.dataset.piece));}
      } else if (target.hasAttribute('data-slide') && dx>22) perform('sleeve');
      else if (target.classList.contains('rp-ring') && dx>22) perform('pull');
    });
    root.addEventListener('pointercancel',()=>{ if(drag){drag.target.style.removeProperty('transform');drag.target.style.removeProperty('--rp-drag');drag=null;} });
    render();
  }
  function leave() { clearTimeout(timer); root?.remove(); root=null; pieces=null; drag=null; }
  function update(dt) { if(!root || saved.phase!=='name'||busy) return; voiceTime+=dt; drawPlan(voiceTime); }
  function draw(ctx) {
    if (root?.classList.contains('rp-depart')) Room.draw(ctx);
  }
  return {name:'parcel',enter,leave,update,draw};
})();

