(() => {
  'use strict';
  const game=document.getElementById('game');
  const field=document.getElementById('habitat');
  const hero=document.getElementById('hero');
  const dialog=document.getElementById('overlay');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const original=[0,2,5,7,4,8];
  const originalColors=[
    {body:'#78ad48',light:'#acd66b',deep:'#426938',accent:'#ef887e',cream:'#fff0b4'},
    {body:'#ec962f',light:'#ffbc59',deep:'#98532e',accent:'#55bdb2',tip:'#8be0cd',cream:'#ffe0a2'},
    {body:'#69a9dc',light:'#9bd2ee',deep:'#445e9d',accent:'#5876d9',cream:'#dbeff0'},
    {body:'#9e72c8',light:'#c398e9',deep:'#664f9b',accent:'#f6aa66',cream:'#fff1d8'},
    {body:'#ec827b',light:'#ffa995',deep:'#9d526a',accent:'#6fcaaf',cream:'#ffe5cd'},
    {body:'#e9b84d',light:'#ffd76e',deep:'#ae6d3e',accent:'#df7d9a',cream:'#fff0bc'},
  ];
  const portraits=new Map();
  const canvas=document.createElement('canvas'), lifted=document.createElement('canvas');
  [canvas,lifted].forEach(el=>{el.width=480;el.height=320;el.setAttribute('aria-hidden','true');});
  canvas.className='dragon-stage-rig';lifted.className='dragon-stage-lift';
  lifted.hidden=true;hero.append(canvas);game.append(lifted);
  const ctx=canvas.getContext('2d'), air=lifted.getContext('2d');
  const limit=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const point=e=>({x:e.clientX,y:e.clientY});
  const smooth=n=>{const t=limit(n,0,1);return t*t*(3-2*t);};
  const getIndex=species=>species>=6?species-6:original[species]??0;
  const touches=new Map();
  let dragon, currentId, currentStage, lastSleep, callbacks, primary, grip, landing, reaction, timers=[], frame=0, last=0, ignoreUntil=0;

  function draw(context,d,pose,time,options={}){
    context.clearRect(0,0,480,320);
    DragonRig.draw(context,{index:getIndex(d.species),stage:d.stage,pose,time,palette:originalColors[d.species],...options});
  }
  function portrait(species,stage,pose='idle'){
    const key=[species,stage,pose].join('/');
    if(!portraits.has(key)){
      const preview=document.createElement('canvas');
      preview.width=480;preview.height=320;
      draw(preview.getContext('2d'),{species,stage},pose,0,{amount:1});
      portraits.set(key,preview.toDataURL('image/webp',.88));
    }
    return portraits.get(key);
  }
  function clearHold(){timers.forEach(clearTimeout);timers=[];}
  function position(mid,width){
    const box=game.getBoundingClientRect(),x=mid.x-box.left,y=mid.y-box.top;
    lifted.style.width=width+'px';
    lifted.style.left=limit(x,18,box.width-18)+'px';
    lifted.style.top=limit(y,26,box.height-62)+'px';
  }
  function cleanupLift(){
    grip=landing=undefined;lifted.hidden=true;lifted.classList.remove('returning');
    hero.classList.remove('dragon-lifted');delete game.dataset.dragonGrip;
  }
  function reset(){
    if(grip){ignoreUntil=performance.now()+350;window.GroveHUD?.cue('release');}
    primary=undefined;touches.clear();clearHold();reaction=undefined;cleanupLift();
  }
  function setDragon(next){
    if(currentId!==next?.id || currentStage!==next?.stage){reset();currentId=next?.id;currentStage=next?.stage;}
    const change=dragon!==next || lastSleep!==next?.sleeping;
    dragon=next;lastSleep=next?.sleeping;
    hero.classList.toggle('rig-specimen',Boolean(next?.species>=6));
    if(change)render(performance.now());
    start();
  }
  function express(pose,duration=900,options={}){
    if(!dragon||grip)return;
    reaction={pose,at:performance.now(),duration,options};
    render(performance.now());start();
  }
  function cue(pose,options={}){callbacks?.cue(pose,options);}
  function contacts(){
    const [a,b]=grip.ids.map(id=>touches.get(id));
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  }
  function grab(a,b){
    clearHold();reaction=undefined;landing=undefined;
    window.GroveCamera?.cancelInput();
    const bBox=hero.getBoundingClientRect();
    grip={ids:[a,b],width:limit(bBox.width*1.86,182,280),x:0,y:0,swing:0,velocity:0};
    const mid=contacts();grip.x=mid.x;grip.y=mid.y;
    liftPointer(a);liftPointer(b);
    hero.classList.add('dragon-lifted');lifted.hidden=false;game.dataset.dragonGrip='held';
    lifted.classList.remove('returning');position(mid,grip.width);
    ignoreUntil=Infinity;cue('lift');render(performance.now());start();
  }
  function liftPointer(id){if(!field.hasPointerCapture(id))field.setPointerCapture(id);}
  function letGo(cancelled){
    const from=grip;
    grip=undefined;touches.clear();primary=undefined;clearHold();ignoreUntil=performance.now()+420;
    if(cancelled||reduced.matches){
      cleanupLift();
      if(cancelled)window.GroveHUD?.cue('release');else cue('release');
      return;
    }
    landing={...from,at:performance.now()};game.dataset.dragonGrip='returning';cue('release');start();
  }
  function hold(id,pose,delay){
    timers.push(setTimeout(()=>{
      if(primary?.id!==id||grip||dragon?.sleeping||!dialog.hidden)return;
      const now=performance.now();const rect=hero.getBoundingClientRect();
      const options={targetX:limit((primary.x-rect.left)/Math.max(1,rect.width)*480,0,480),targetY:limit((primary.y-rect.top)/Math.max(1,rect.height)*320,0,320)};
      ignoreUntil=now+720;primary.reacted=true;
      express(pose,pose==='bite'?750:540,options);cue(pose,options);
    },delay));
  }
  field.addEventListener('pointerdown',e=>{
    if(!dragon||hero.classList.contains('egg')||e.button!==0||!dialog.hidden)return;
    const onDragon=hero.contains(e.target);
    const rect=hero.getBoundingClientRect();
    const near=rect.width>=27&&e.clientX>=rect.left-27&&e.clientX<=rect.right+27&&e.clientY>=rect.top-26&&e.clientY<=rect.bottom+18;
    if(grip){e.stopImmediatePropagation();return;}
    if(primary?.touch && e.pointerType==='touch' && near && primary.id!==e.pointerId){
      touches.set(e.pointerId,point(e));grab(primary.id,e.pointerId);e.preventDefault();e.stopImmediatePropagation();return;
    }
    if(primary?.touch&&e.pointerType==='touch'&&primary.id!==e.pointerId){primary=undefined;touches.clear();clearHold();return;}
    if(primary||!onDragon)return;
    window.GroveFlight?.quietHero();
    primary={id:e.pointerId,...point(e),touch:e.pointerType==='touch',distance:0,reacted:false};
    touches.set(e.pointerId,point(e));
    if(!hero.hasPointerCapture(e.pointerId))hero.setPointerCapture(e.pointerId);
    if(!dragon.sleeping){hold(e.pointerId,'growl',480);hold(e.pointerId,'angry',800);hold(e.pointerId,'bite',1190);}
  },true);
  field.addEventListener('pointermove',e=>{
    if(!touches.has(e.pointerId))return;
    touches.set(e.pointerId,point(e));
    if(grip){
      const mid=contacts();grip.velocity=limit((mid.x-grip.x)*.065,-1,1);grip.x=mid.x;grip.y=mid.y;
      position(mid,grip.width);e.preventDefault();e.stopImmediatePropagation();return;
    }
    if(primary?.id!==e.pointerId||primary.reacted)return;
    primary.distance+=Math.hypot(e.clientX-primary.x,e.clientY-primary.y);
    Object.assign(primary,point(e));
    if(primary.distance>=24){
      primary.reacted=true;clearHold();ignoreUntil=performance.now()+450;
      callbacks?.stroke();
    }
  },true);
  function release(e){
    if(grip?.ids.includes(e.pointerId)){
      letGo(e.type==='pointercancel');e.stopImmediatePropagation();return;
    }
    if(primary?.id!==e.pointerId)return;
    if(primary.reacted)ignoreUntil=performance.now()+350;
    primary=undefined;touches.delete(e.pointerId);clearHold();
  }
  window.addEventListener('pointerup',release,true);
  window.addEventListener('pointercancel',release,true);
  hero.addEventListener('contextmenu',e=>{if(dragon)e.preventDefault();});

  function render(now){
    if(reaction && now-reaction.at>=reaction.duration)reaction=undefined;
    hero.classList.toggle('dragon-rig-visible',Boolean(dragon&&(dragon.species>=6 || reaction)));
    if(landing){
      const t=limit((now-landing.at)/460,0,1),p=smooth(t),box=hero.getBoundingClientRect();
      const mid={x:landing.x+(box.left+box.width*.5-landing.x)*p,y:landing.y+(box.top+box.height*.37-landing.y)*p};
      position(mid,landing.width+(box.width-landing.width)*p);
      draw(air,dragon,t<.75?'hang':'land',now*.001,{amount:1-p,sway:landing.swing*(1-p)});
      if(t>=1)cleanupLift();
    }
    if(grip){
      grip.swing+=(grip.velocity-grip.swing)*.12;grip.velocity*=.88;
      draw(air,dragon,'hang',reduced.matches?0:now*.001,{amount:1,sway:grip.swing});
    }else if(dragon && !landing && hero.classList.contains('dragon-rig-visible')){
      const time=reduced.matches?0:now*.001;
      const age=reaction?(now-reaction.at):0;
      const amount=reaction?smooth(age/95)*(1-smooth((age-reaction.duration*.72)/(reaction.duration*.28))):1;
      draw(ctx,dragon,reaction?.pose||(dragon.sleeping?'sleep':'idle'),time,{amount,...reaction?.options});
    }
  }
  function tick(now){
    frame=0;
    if(document.hidden||!dragon)return;
    if(now-last>26){last=now;render(now);}
    start();
  }
  function start(){
    if(!frame&&!document.hidden&&dragon&&(reaction||landing||grip||(dragon.species>=6&&!reduced.matches)))frame=requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(frame);frame=0;reset();}
    else if(dragon){render(performance.now());start();}
  });
  reduced.addEventListener('change',()=>{render(performance.now());start();});
  window.DragonStage={draw,portrait,setDragon,express,
    configure(options){callbacks=options;},consumesClick(){return performance.now()<ignoreUntil;}};
})();
