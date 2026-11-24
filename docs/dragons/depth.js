(() => {
  'use strict';
  const game=document.getElementById('game'), habitat=document.getElementById('habitat');
  const world=document.getElementById('world');
  const planes=[...habitat.querySelectorAll('.depth-plane')];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,n)=>Math.max(-n,Math.min(n,v));
  const vantage=[0,0];
  function setView(zoom,dx,dy){
    vantage[0]=-clamp(dx/Math.max(1,zoom)*4.9,4.3);
    vantage[1]=clamp(dy/Math.max(1,zoom)*2.5,2.1);
    window.GroveValley?.setVantage?.(...vantage);
    planes.forEach((plane,i)=>{
      const depth=i===0?.11:.24;
      plane.style.setProperty('--pan-x',(-7+clamp(dx*depth*100,7))+'%');
      plane.style.setProperty('--pan-y',(-7+clamp(dy*depth*100,7))+'%');
      plane.style.setProperty('--zoom',1.14+Math.min(.18,Math.max(0,zoom-1)*depth*.44));
    });
  }
  function wildlifeMask(canvas){
    const rect=world.getBoundingClientRect(), origin=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    const left=rect.left-origin.left,top=rect.top-origin.top;
    return (x,y)=>GroveFog.blocked((x-left)/rect.width,(y-top)/rect.height);
  }
  let x=0,y=0,targetX=0,targetY=0,time=0,prev=0,frame=0,anchor=null;
  const limit=v=>Math.min(1,Math.max(-1,v));
  function look(e){
    if(reduce.matches || habitat.dataset.gesture || !document.getElementById('overlay').hidden)return;
    const r=habitat.getBoundingClientRect();
    if(e.pointerType==='touch'){
      if(!anchor || anchor.id!==e.pointerId)return;
      targetX=limit((e.clientX-anchor.x)/(r.width*.22));
      targetY=limit((e.clientY-anchor.y)/(r.height*.18));
    }else{
      targetX=limit(2*(e.clientX-r.left)/r.width-1);targetY=limit(2*(e.clientY-r.top)/r.height-1);
    }
  }
  function release(){anchor=null;targetX=0;targetY=0;}
  habitat.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')anchor={id:e.pointerId,x:e.clientX,y:e.clientY};});
  habitat.addEventListener('pointermove',look,{passive:true});
  habitat.addEventListener('pointerleave',release);window.addEventListener('pointerup',e=>{if(e.pointerType==='touch')release();});window.addEventListener('pointercancel',release);
  function tick(now){
    if(now-prev>=32){
      const dt=Math.min(.07,(now-prev)/1000);prev=now;
      if(document.getElementById('overlay').hidden){
        time+=dt;x+=(targetX-x)*(1-Math.exp(-dt*7));y+=(targetY-y)*(1-Math.exp(-dt*7));
        game.style.setProperty('--look-x',(x*13+Math.sin(time*.42)*4.4).toFixed(2)+'px');
        game.style.setProperty('--look-y',(y*8+Math.sin(time*.32)*2.6).toFixed(2)+'px');
      }
    }
    frame=requestAnimationFrame(tick);
  }
  function restart(){
    cancelAnimationFrame(frame);prev=performance.now();release();
    if(!document.hidden&&!reduce.matches)frame=requestAnimationFrame(tick);
    else {game.style.removeProperty('--look-x');game.style.removeProperty('--look-y');}
  }
  document.addEventListener('visibilitychange',restart);reduce.addEventListener('change',restart);restart();
  window.GroveDepth={setView,wildlifeMask,vantage};
})();
