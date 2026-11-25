(() => {
  'use strict';
  const game=document.getElementById('game');
  const field=document.getElementById('habitat');
  const hero=document.getElementById('hero');
  const dialog=document.getElementById('overlay');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const image=document.getElementById('hero-img'), lifted=new Image();
  lifted.className='dragon-stage-lift';lifted.alt='';lifted.hidden=true;game.append(lifted);
  const limit=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const point=e=>({x:e.clientX,y:e.clientY});
  const smooth=n=>{const t=limit(n,0,1);return t*t*(3-2*t);};
  const touches=new Map();
  let dragon, currentId, currentStage, lastSleep, callbacks, primary, grip, landing, reaction, timers=[], frame=0, last=0, ignoreUntil=0;

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
    primary=undefined;touches.clear();clearHold();reaction=undefined;clearReaction();cleanupLift();
  }
  function setDragon(next){
    if(currentId!==next?.id || currentStage!==next?.stage){reset();currentId=next?.id;currentStage=next?.stage;}
    const change=dragon!==next || lastSleep!==next?.sleeping;
    dragon=next;lastSleep=next?.sleeping;
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
    clearHold();reaction=undefined;clearReaction();landing=undefined;
    window.GroveCamera?.cancelInput();
    const bBox=hero.getBoundingClientRect();
    grip={ids:[a,b],width:limit(bBox.width*1.86,182,280),x:0,y:0,swing:0,velocity:0};
    const mid=contacts();grip.x=mid.x;grip.y=mid.y;
    liftPointer(a);liftPointer(b);
    hero.classList.add('dragon-lifted');lifted.hidden=false;game.dataset.dragonGrip='held';
    lifted.src=image.currentSrc||image.src;
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

  function clearReaction(){
    delete hero.dataset.dragonReaction;
    image.style.removeProperty('--reaction-transform');
  }
  function render(now){
    if(reaction && now-reaction.at>=reaction.duration){reaction=undefined;clearReaction();}
    if(landing){
      const t=limit((now-landing.at)/460,0,1),p=smooth(t),box=hero.getBoundingClientRect();
      const mid={x:landing.x+(box.left+box.width*.5-landing.x)*p,y:landing.y+(box.top+box.height*.37-landing.y)*p};
      position(mid,landing.width+(box.width-landing.width)*p);
      lifted.style.rotate=(20+18*landing.swing)*(1-p)+'deg';
      if(t>=1)cleanupLift();
    }
    if(grip){
      grip.swing+=(grip.velocity-grip.swing)*.12;grip.velocity*=.88;
      lifted.style.rotate=(reduced.matches?10:17+grip.swing*27+Math.sin(now*.009)*4)+'deg';
    }else if(reaction&&!landing){
      const age=now-reaction.at, amount=smooth(age/95)*(1-smooth((age-reaction.duration*.72)/(reaction.duration*.28)));
      const side=reaction.options.targetX>=240?1:-1;
      const lean=reaction.pose==='bite'?side*10:reaction.pose==='angry'?Math.sin(age*.064)*6:Math.sin(age*.024)*3;
      const push=reaction.pose==='bite'?side*amount*9:0;
      hero.dataset.dragonReaction=reaction.pose;
      image.style.setProperty('--reaction-transform',reduced.matches?'none':`translateX(${push}px) rotate(${lean*amount}deg) scale(${1+amount*.035})`);
    }
  }
  function tick(now){
    frame=0;
    if(document.hidden||!dragon)return;
    if(now-last>26){last=now;render(now);}
    start();
  }
  function start(){
    if(!frame&&!document.hidden&&dragon&&(reaction||landing||grip))frame=requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(frame);frame=0;reset();}
    else if(dragon){render(performance.now());start();}
  });
  reduced.addEventListener('change',()=>{render(performance.now());start();});
  window.DragonStage={setDragon,express,
    configure(options){callbacks=options;},consumesClick(){return performance.now()<ignoreUntil;}};
})();
