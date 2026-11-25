(() => {
  'use strict';
  const hero = document.querySelector('#hero');
  const world = document.querySelector('#world');
  const game = document.querySelector('#game');
  const overlay = document.querySelector('#overlay');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const plant = document.createElement('button');
  plant.type = 'button';
  plant.id = 'grove-forage';
  plant.dataset.treeSeat = '0';
  plant.hidden = true;
  // Plant, fruit and corolla remain independent layers at every camera scale.
  const fruit = (x,y,tilt,scale) => `<g class="forage-fruit" transform="translate(${x} ${y}) rotate(${tilt}) scale(${scale})">
    <path fill="#c96069" d="M0-9C7-13 14-8 13-1 12 6 5 14 0 17-6 16-14 10-14 2-15-5-10-11-3-9Z"/>
    <path fill="#ef8d73" d="M-12 0c0-7 5-10 10-8 7-3 12 1 12 5C9 3 5 9 0 12-6 11-12 7-12 0Z"/>
    <path fill="#ffd197" d="M-8-4q4-5 8-2-6 1-8 6-3-1 0-4Z"/>
    <path fill="#466e5d" d="m-7-10 5 1 2-5 2 5 6-2-4 5-4-1-3 2-1-4Z"/>
  </g>`;
  plant.innerHTML = `<svg viewBox="0 0 110 110" aria-hidden="true">
    <path fill="#454e55" opacity=".32" d="M1 96c13-5 39-5 48-1-9 4-36 7-48 1Z"/>
    <path fill="#55745d" d="M11 96C31 85 22 64 36 47c9-12 24-15 30-32l3 1C65 36 46 42 39 51 27 67 38 85 22 96Z"/>
    <path fill="#81a573" d="M28 74C15 72 8 61 7 51c13 2 24 10 21 23ZM32 59C40 41 49 37 58 38 55 48 46 57 32 59Z"/>
    <path fill="#a9bb83" d="M7 51c11 5 16 11 20 19-8-4-14-10-20-19Z"/>
    <path fill="#6e9b75" d="M52 36C37 33 31 23 33 12c11 3 19 11 19 24Z"/>
    <path fill="#91b58a" d="M59 32c6-12 18-17 30-15-4 11-16 16-30 15Z"/>
    <path d="M48 40q-2 11-1 16m11-25c1 12 4 14 11 20m-3-32q13 5 19 16" fill="none" stroke="#526b59" stroke-width="2.1" stroke-linecap="round"/>
    ${fruit(48,61,-13,.79)}${fruit(71,56,-7,.95)}${fruit(86,39,17,.73)}
    <g class="forage-corolla" transform="translate(65 15)">
      <g class="forage-petals"><path fill="#ba728b" d="M0 6Q-19 3-17-9q12-1 17 10Q-1-15 8-21q8 7-3 23Q16-8 24-4q-5 12-22 14Z"/>
      <path fill="#f5b7b5" d="M0 7C-11 3-14-4-11-13-4-11-2-5 1 2 1-10 6-15 12-16c1 9-5 17-10 21 7-5 11-7 17-5-4 7-11 10-19 8Z"/>
      <path fill="#ffde9e" d="M-3 5q4-5 8-2l-2 6-5 1Z"/></g>
      <path class="forage-bud" fill="#eeb3a8" d="M-1 5C-6 1-6-5-3-10c6 1 10 7 7 12L0 6Z"/>
      <path fill="#598e72" d="M-2 9q-6-5-6-10l6 4 5-4-1 5 6-3q-3 7-10 8Z"/>
    </g></svg>`;
  const fruitNodes = [...plant.querySelectorAll('.forage-fruit')];
  const hand = document.createElement('span');
  hand.className = 'forage-hand';
  hand.setAttribute('aria-hidden','true');
  hand.innerHTML = '<svg viewBox="-17 -15 34 35">'+fruit(0,0,0,1)+'</svg>';
  hand.hidden = true;
  const cue = document.createElement('span');
  cue.className = 'forage-cue';
  cue.setAttribute('aria-hidden','true');
  hero.append(cue);
  const blossom='<path fill="#d7849b" d="M0 4Q-13 3-12-5-5-8 0 1q-3-11 3-14 7 3 3 12 6-7 13-4 1 9-11 12Z"/><path fill="#f8bac6" d="M1 5Q-7-1-6-8 0-7 2 0q1-9 7-10 3 6-5 14 8-5 13-3-5 8-15 7Z"/><circle cx="3" cy="4" r="2.7" fill="#ffe29b"/>';
  const blooms=GroveCamera.mounts.slice(1).map(([x,y],i)=>{
    const index=i+1,bloom=document.createElement('button');
    bloom.type='button';bloom.className='forage-bloom';bloom.dataset.treeSeat=index;
    bloom.hidden=true;bloom.style.left=x+'%';bloom.style.top=y+'%';
    bloom.setAttribute('aria-label','Позвать яйцо · цветок на ветви '+(index+1));
    bloom.innerHTML='<svg viewBox="0 0 86 60" aria-hidden="true"><path fill="#598771" d="M81 54C62 53 55 44 48 36 34 30 20 27 13 16c17 0 27 8 34 16-3-14 2-21 7-24 1 10 0 19-3 28 10 11 20 15 30 18Z"/><g transform="translate(14 15) scale(.85)">'+blossom+'</g><g transform="translate(41 17) scale(.55)">'+blossom+'</g><g transform="translate(57 37) scale(.98)">'+blossom+'</g></svg>';
    bloom.onclick=()=>chooseOffering(index);
    world.append(bloom);return bloom;
  });
  const waiting=document.createElement('button');
  waiting.type='button';waiting.id='forage-waiting';waiting.dataset.treeSeat='0';waiting.hidden=true;
  const spareEgg=new Image();spareEgg.src=groveAsset('assets/grove-v2/egg.webp');spareEgg.alt='';
  waiting.append(spareEgg);world.append(waiting);
  waiting.onclick=()=>{if(Grove.s.eggs.length){callbacks.sound('egg');callbacks.nest();}};
  world.append(plant);
  game.append(hand);
  const regrowMs = 70000;
  let callbacks, selected = -1, selectedDragon, pointer, wakeTimer, swallowUntil = 0;
  const fruitTimes = () => Array.isArray(Grove.s.berryRipeAt) ? Grove.s.berryRipeAt : [];
  const ripe = i => !(Number(fruitTimes()[i]) > Date.now());
  const available = () => fruitNodes.findIndex((_,i)=>ripe(i));
  const canForage = () => Grove.current() && !Grove.current().sleeping && hero.dataset.treeSeat === '0';
  const canOpen = () => Branches.count() === 1 && Grove.s.branches?.done === true;
  function cancel() {
    selected = -1; selectedDragon = null; pointer = null;
    hand.hidden = true;
    hero.classList.remove('forage-offer');
    cue.textContent = '';
  }
  function sync() {
    const dragon = Grove.current();
    if (!canForage() || selectedDragon !== dragon?.id || (selected >= 0 && !ripe(selected))) cancel();
    plant.hidden = !canForage();
    blooms.forEach((bloom,i)=>{
      bloom.hidden=i+1>=Branches.count();bloom.disabled=!Grove.canInvite(i+1);
    });
    waiting.hidden=!Grove.s.eggs.length || Grove.s.focus==='egg';
    waiting.setAttribute('aria-label','Согреть следующее яйцо в гнезде · '+Grove.s.eggs.length);
    const awaiting = canOpen();
    plant.classList.toggle('forage-awake',awaiting);
    plant.classList.toggle('forage-flowered',Branches.count()>1);
    plant.setAttribute('aria-label',awaiting ? 'Коснуться бутона и открыть цветущую ветвь' : 'Сорвать спелую ягоду');
    plant.disabled = !awaiting && available() < 0;
    fruitNodes.forEach((node,i)=>node.classList.toggle('forage-picked',i === selected || !ripe(i)));
    if (!plant.hidden && selected >= 0) {
      hero.classList.add('forage-offer');
      cue.textContent = 'Угостить';
    }
    clearTimeout(wakeTimer);
    const next = Math.min(...fruitTimes().filter(n=>Number(n)>Date.now()));
    if (Number.isFinite(next)) wakeTimer = setTimeout(sync,Math.max(1,next-Date.now()+30));
  }
  function pick(target) {
    if (!canForage() || !overlay.hidden) return false;
    const index = fruitNodes.indexOf(target.closest?.('.forage-fruit'));
    selected = index >= 0 && ripe(index) ? index : available();
    if (selected < 0) return false;
    selectedDragon = Grove.current().id;
    window.GroveFlight?.quietHero();
    callbacks.sound('click');
    sync();
    return true;
  }
  function feed() {
    if (selected<0 || !canForage() || !overlay.hidden || Grove.current().id!==selectedDragon || !ripe(selected)) return false;
    const index=selected;
    cancel();
    const times=fruitTimes().slice(0,fruitNodes.length);
    times[index]=Date.now()+regrowMs;
    Grove.s.berryRipeAt=times;
    callbacks.feed(); // The normal care action owns food, XP, sound, saving and mission progress.
    if (canOpen()) callbacks.toast('Бутон проснулся! Коснись его, чтобы раскрыть ветвь.');
    sync();
    return true;
  }
  function openFlower() {
    if (!canOpen() || !overlay.hidden) return;
    cancel();
    if (Branches.openNext())callbacks.sound('school');
    sync();
  }
  window.addEventListener('grove-branches-changed',event=>{
    const index=event.detail?.opened;
    if(!blooms[index-1])return;
    blooms[index-1].classList.add('revealed');
    requestAnimationFrame(()=>{
      window.GroveCamera.revealBranch?.(index);
      callbacks.toast(index===1?'Ветвь открыта · +8 пыльцы. Коснись цветка.':'Коснись цветка на новой ветви.');
      window.dispatchEvent(new CustomEvent('grove-forage-awaken',{detail:{index}}));
    });
  });
  const offerings=[
    {id:'dew',name:'Лесная роса',families:'Цветущие, росистые, лунные',art:'<path fill="#52876e" d="M3 47Q40 55 57 14C24 11 9 25 3 47Z"/><path fill="#96bb8b" d="M5 46q31-15 50-30-14 24-50 30Z"/><path fill="#78bbbf" d="M30 5c-1 9-9 15-9 22 0 14 20 14 21 1 0-9-7-15-12-23Z"/><path fill="#d2efdb" d="M28 15q-9 10-4 15 4 3 5-2-5-1-1-13Z"/>'},
    {id:'resin',name:'Янтарная смола',families:'Огненные, коралловые, солнечные',art:'<path fill="#877067" d="M4 21Q23 14 52 4l5 5Q34 24 7 28Z"/><path fill="#609572" d="M41 10Q41 1 53 0q0 10-12 10Z"/><path fill="#ce8550" d="M27 18q14-6 13 3c-1 7-2 10 2 16 8 12-6 21-17 14-9-6-1-17 2-24q2-6 0-9Z"/><path fill="#edb85f" d="M33 20c6-2 2 7 2 11-1 6 9 11 2 17-5 2-15-2-10-9 7-11 8-14 6-19Z"/><path fill="#ffe1a1" d="M28 34q-4 9-1 11 4 1 3-3-2-2 1-10Z"/>'}
  ];
  function chooseOffering(index){
    if(!Grove.canInvite(index) || !overlay.hidden)return;
    const body=callbacks.invitationSheet('Позвать дракона');
    const intro=document.createElement('p');
    intro.textContent='Оставь цветку дар. От него зависит, какое яйцо появится в гнезде.';
    body.append(intro);
    for(const lure of offerings){
      const choice=document.createElement('button');
      choice.type='button';choice.className='forage-lure';choice.dataset.lure=lure.id;
      choice.innerHTML='<svg aria-hidden="true" viewBox="0 0 60 55">'+lure.art+'</svg><span><b>'+lure.name+'</b><small>'+lure.families+'</small></span>';
      choice.onclick=()=>{
        const queued=Grove.s.eggs.length;
        if(!Grove.invite(index,lure.id))return;
        callbacks.close();callbacks.nest();callbacks.sound('school');
        hero.classList.remove('forage-arrival');void hero.offsetWidth;hero.classList.add('forage-arrival');
        clearTimeout(arrivalTimer);arrivalTimer=setTimeout(()=>hero.classList.remove('forage-arrival'),1700);
        callbacks.toast(queued?'Новое яйцо подождёт в гнезде. Можно догреть первое.':'Кто-то откликнулся! Согрей новое яйцо.');
      };
      body.append(choice);
    }
    if(Grove.s.eggs.length){
      const queue=document.createElement('p');queue.className='forage-queue-note';
      queue.textContent='В гнезде уже есть яйцо. Новое дождётся своей очереди.';body.append(queue);
    }
  }
  let arrivalTimer;
  function pointHand(x,y) {
    const rect=game.getBoundingClientRect();
    hand.style.left=(x-rect.left)+'px';
    hand.style.top=(y-rect.top)+'px';
    hand.hidden=false;
  }
  plant.addEventListener('pointerdown',event=>{
    swallowUntil=0;
    if(event.button!==0 || !event.isPrimary || canOpen() || !pick(event.target))return;
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
    plant.setPointerCapture(event.pointerId);
  });
  plant.addEventListener('pointermove',event=>{
    if(!pointer || event.pointerId!==pointer.id)return;
    if(Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>7)pointer.moved=true;
    if(pointer.moved)pointHand(event.clientX,event.clientY);
  });
  plant.addEventListener('pointerup',event=>{
    if(!pointer || event.pointerId!==pointer.id)return;
    const moved=pointer.moved;
    pointer=null;
    hand.hidden=true;
    swallowUntil=performance.now()+450;
    if (!moved) return;
    const box=hero.getBoundingClientRect(), x=event.clientX, y=event.clientY;
    if(x>=box.left-10 && x<=box.right+10 && y>=box.top-10 && y<=box.bottom+10)feed();
    else {cancel();sync();}
  });
  function interrupted(){if(pointer){cancel();sync();}}
  plant.addEventListener('lostpointercapture',interrupted);
  plant.addEventListener('pointercancel',interrupted);
  plant.addEventListener('click',event=>{
    event.stopPropagation();
    if(event.detail && performance.now()<swallowUntil)return;
    if(canOpen())openFlower();else pick(event.target);
  });
  world.addEventListener('click',event=>{
    if(selected>=0 && event.target.closest('#hero') && feed()){
      event.preventDefault();event.stopPropagation();
    }
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && selected>=0){cancel();sync();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();sync();});
  new MutationObserver(()=>{if(!overlay.hidden){cancel();sync();}}).observe(overlay,{attributes:true,attributeFilter:['hidden']});
  window.GroveForage={configure(options){callbacks=options;},sync};
})();
