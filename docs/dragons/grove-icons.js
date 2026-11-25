/* HUD renderer for the portrait grove. Load after icons.js and before game.js. */
(() => {
  'use strict';
  const ink = '#403f46';
  const p = (d, fill, edge=ink, width=1.8) => `<path d="${d}" fill="${fill}" stroke="${edge}" stroke-width="${width}"/>`;
  const line = (d, color, width=1.6) => p(d,'none',color,width);
  const dot = (x,y,r,fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  const cheek = '#edae9d';
  const face = p('M8 25Q7 17 15 14L15 8Q20 8 23 13L28 11Q32 5 36 6L35 15Q41 17 41 25L43 29Q44 35 38 37Q29 42 19 39Q8 37 8 30Z','#a4d49e')+
    p('M10 28Q15 34 25 32Q33 30 41 28L42 32Q40 38 28 40Q15 40 10 34Z','#f0d99d','none')+
    line('M15 12 17 16M32 10 31 15','#e1ecb5')+dot(38,28,.85,ink);
  const hand = p('M4 34Q5 30 10 31L16 34 18 33 13 30Q12 28 14 27Q16 26 20 28L25 31 32 30Q38 28 39 30Q40 32 35 35L26 39Q21 42 16 41L6 39Z','#f4ca98')+
    line('M8 34Q10 33 14 36M24 35 30 33','#c69872',1.4);
  const painted = {
    caress:p('M19 13C14 5 7 10 9 16Q11 21 18 23Q26 15 25 12Q23 8 19 13Z','#e79394','#844f5a',1.5)+
      p('M23 22Q26 17 30 17L33 12 35 18Q41 19 42 25L44 28Q43 32 36 33Q28 34 21 30L18 26Z','#a6d5a2')+
      line('M29 24Q31 26 34 23','#4b665c')+dot(40,26,.7,ink)+hand,
    purr:face+line('M15 24Q18 27 21 23M27 23Q30 26 33 22','#426059',2)+dot(17,28,2,cheek)+
      line('M4 18Q1 15 4 12M6 14Q4 11 7 9M38 41Q43 40 45 36','#c8b0f1',2),
    growl:face+line('M14 19 21 22M27 21 32 18','#4e5050',2)+dot(20,24,1.5,'#4c4652')+dot(30,23.7,1.5,'#4c4652')+
      p('M22 32Q28 29 35 31L33 35Q28 36 22 33Z','#534050','#4c4044',1.3)+p('M27 31 29 34.5 31 30.8Z','#fff1c9','none')+
      line('M4 20 2 17 4 14M39 12 41 9 40 7','#ffbc81',2.1),
    bite:p('M5 16Q22 7 41 13L38 24 33 18 25 25 20 19 14 25 12 20 7 23Z','#f4dda8')+
      p('M7 29 14 32 17 28 23 33 29 28 34 30 40 22Q43 36 35 39Q20 44 8 36Z','#e4b38a')+
      line('M5 7 9 10M26 2 25 7M42 6 39 10','#ffcc83',2),
    pouch:p('M14 15Q13 11 11 6Q16 4 21 9L25 5 30 9 36 6Q35 12 32 16Q41 23 42 31Q43 41 29 43Q14 46 7 39Q2 31 9 23Z','#b692cc')+
      p('M15 15Q24 18 33 14L34 19Q24 22 13 19Z','#efd590','#685546',1.5)+
      line('M15 22Q8 29 10 34','#dcc2eb',2.2)+p('M21 26Q29 23 33 24Q31 33 23 35Q20 31 21 26Z','#a6cc8b','#667561',1.2)+
      line('M21 35 29 28','#60715d',1.4),
    care:p('M11 19Q14 12 20 13Q22 7 29 9Q37 11 37 20Q44 29 37 37Q29 44 17 40Q5 36 8 26Z','#99c7b6')+
      p('M18 27Q16 23 19 21Q22 19 25 23Q29 19 32 22Q36 26 30 31L25 35Q21 31 18 27Z','#fae8aa','#658578',1.3)+
      line('M11 24Q12 18 17 18','#caead5',2),
    feather:p('M7 37Q7 19 22 10Q31 5 42 5Q40 17 33 26L27 26 28 29Q19 36 10 36L8 42 4 43Z','#bbdba1','#5e775d',1.7)+
      line('M10 35Q20 24 35 13M21 24 23 15M19 27 29 26','#72946b',1.7)
  };
  function icon(key) {
    if(!painted[key]) return window.glyph(key);
    return '<svg class="grove-illustration gh-illustration" viewBox="0 0 48 48" aria-hidden="true" focusable="false" stroke-linecap="round" stroke-linejoin="round">'+painted[key]+'</svg>';
  }
  const labels={purr:'Урчит',growl:'Рычит',bite:'Кусь!',lift:'На руках'};
  let dock,menu,game,last='',more,careDrawer,timer,activeDrawer,petThumb='';
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function closeDrawers(restore=false) {
    if(!activeDrawer)return;
    const d=activeDrawer;activeDrawer=null;d.open=false;
    if(restore)d.querySelector('summary')?.focus({preventScroll:true});
  }
  function disclose(details) {
    if(!details)return;
    details.addEventListener('toggle',()=>{
      if(!details.isConnected)return;
      if(details.open){
        if(activeDrawer && activeDrawer!==details)activeDrawer.open=false;
        activeDrawer=details;
      }else if(activeDrawer===details)activeDrawer=null;
    });
  }
  const menuButton=(key,text,img)=>`<button type="button" class="gh-link" data-page="${key}">${icon(img)}<span>${text}</span></button>`;
  const careButton=(key,text,img,klass='gh-link')=>`<button type="button" class="${klass}" data-care="${key}">${icon(img)}<span>${text}</span></button>`;
  function mount(){
    if(game?.isConnected) return;
    game=document.getElementById('game'); menu=document.getElementById('menu'); dock=document.getElementById('dock');
    const audio=document.getElementById('audio-toggle');
    if(!game||!menu||!dock||!audio)throw new Error('GroveHUD requires #game, #menu, #dock and #audio-toggle.');
    game.classList.add('gh-ready');
    menu.innerHTML=menuButton('school','Школа','book')+menuButton('games','Игры','games')+
      '<details id="gh-more" class="gh-details"><summary class="gh-link">'+icon('pouch')+'<span>Ещё</span></summary><div class="gh-pop" aria-label="Другие занятия">'+
      '<button type="button" class="gh-link gh-atlas" data-page="collection">'+icon('collection')+'<span>Коллекция<small>Атлас драконов</small></span></button>'+menuButton('shop','Лавка','shop')+menuButton('qr','QR игрушки','qr')+'</div></details>';
    more=document.getElementById('gh-more');
    if (location.protocol==='https:' || location.protocol==='http:') {
      const island=document.createElement('a');island.className='gh-link';island.href='island/';
      island.innerHTML=icon('leaf')+'<span>Остров Листика</span>';more.querySelector('.gh-pop').append(island);
    }
    more.querySelector('.gh-pop').append(audio);
    disclose(more);
    // The actual audio node stays mounted. Its existing click handler and live
    // aria-pressed state still belong to the game's audio controller.
    document.addEventListener('pointerdown',e=>{if(activeDrawer && !activeDrawer.contains(e.target))closeDrawers();},true);
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&activeDrawer){e.preventDefault();e.stopImmediatePropagation();closeDrawers(true);}
    },true);
    menu.addEventListener('click',e=>{
      if(e.target.closest('[data-page]'))closeDrawers(true);
    });
    dock.addEventListener('click',e=>{
      if(e.target.closest('[data-care]') && activeDrawer===careDrawer)closeDrawers(true);
    });
    const iconHost=game.querySelector('.brand-symbol');if(iconHost)iconHost.innerHTML=icon('feather');
    const live=document.createElement('output');live.id='gh-cue';live.setAttribute('role','status');
    live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');game.append(live);
  }
  function draw(mode,signature,html){
    if(signature===last)return;
    const wasOpen=careDrawer?.open && mode==='pet';
    const previous=dock.contains(document.activeElement)?document.activeElement:null;
    const focusedKey=previous?.closest('[data-care]')?.dataset.care;
    const wasSummary=previous?.tagName==='SUMMARY';
    if(activeDrawer===careDrawer)activeDrawer=null;
    last=signature;dock.dataset.mode=mode;dock.innerHTML=html;
    careDrawer=dock.querySelector('details');disclose(careDrawer);
    if(wasOpen && careDrawer){careDrawer.open=true;activeDrawer=careDrawer;}
    if(focusedKey)dock.querySelector('[data-care="'+focusedKey+'"]')?.focus({preventScroll:true});
    else if(wasSummary)careDrawer?.querySelector('summary')?.focus({preventScroll:true});
  }
  function egg({warmth=0}={}){
    if(!dock)mount();
    const n=Math.max(0,Math.min(2,Number(warmth)||0)),title=['Драконье яйцо','Яйцо шевелится','Скорлупа трещит'][n];
    const text=['Дракону нужно тепло','Изнутри слышен стук','Малыш готов вылупиться'][n];
    const marks='<span class="gh-warmth" role="img" aria-label="Тепло '+n+' из 3">'+[0,1,2].map(i=>'<i'+(i<n?' class="is-warm"':'')+'></i>').join('')+'</span>';
    draw('egg','egg'+n,'<div class="gh-egg-mark">'+icon('egg')+'</div><div class="gh-caption"><h2>'+title+'</h2><small>'+text+'</small>'+marks+'</div>'+careButton('warm',n===2?'Вылупить':'Согреть','hand','gh-primary'));
  }
  function hints(){
    return '<div class="gh-gestures"><strong>Жесты</strong><p>'+icon('purr')+'<span>Погладь дважды — заурчит.</span></p><p>'+icon('growl')+'<span>Задержи палец — зарычит и щёлкнет зубами.</span></p><p>'+icon('hand')+'<span>Подними двумя пальцами. Отпусти — вернётся.</span></p></div>';
  }
  function pet({name,stage,sprite='',sleeping=false,canGrow=false,hasCommand=false}){
    if(!dock)mount();
    const sig=JSON.stringify([name,stage,sleeping,canGrow,hasCommand]);
    if(sprite!==petThumb){petThumb=sprite;last='';}
    const status=sleeping?'Спит':canGrow?'Пора вырасти':stage;
    const profile='<button type="button" class="gh-profile" data-care="profile" aria-label="Паспорт дракона '+escape(name)+'"><span class="gh-avatar"><img alt="" /></span><span class="gh-caption"><h2>'+escape(name)+'</h2><small>'+escape(status||'')+'<b aria-hidden="true"> ›</b></small></span></button>';
    const primary=sleeping?careButton('sleep','Разбудить','sun','gh-primary'):careButton('pet','Ласкать','caress','gh-primary');
    const feed=sleeping?'':careButton('feed','Угостить','berry','gh-feed');
    const secondary=sleeping?'':'<details class="gh-details gh-care"><summary aria-label="Открыть уход за драконом">'+icon('care')+'<span>Уход</span></summary><div class="gh-pop" aria-label="Уход за драконом">'+
      careButton('wash','Умыть','drop')+
      careButton('sleep',sleeping?'Разбудить':'Уложить','moon')+
      (hasCommand?careButton('command','Подать команду','spark'):'')+hints()+'</div></details>';
    draw('pet','pet'+sig,profile+primary+feed+secondary);
    const image=dock.querySelector('.gh-avatar img');
    if(image && image.getAttribute('src')!==sprite)image.src=sprite;
  }
  function cue(kind){
    const out=document.getElementById('gh-cue');if(!out)return;
    if(kind==='release'){clearTimeout(timer);out.classList.remove('visible');out.textContent='';delete out.dataset.cue;return;}
    if(!labels[kind])return;
    clearTimeout(timer);out.dataset.cue=kind;out.innerHTML=icon(kind==='lift'?'hand':kind)+'<span>'+labels[kind]+'</span>';
    out.classList.remove('visible');void out.offsetWidth;out.classList.add('visible');
    if(kind!=='lift')timer=setTimeout(()=>{out.classList.remove('visible');out.textContent='';},1650);
  }
  window.GroveHUD=Object.freeze({mount,egg,pet,icon,cue,closeDrawers});
})();
