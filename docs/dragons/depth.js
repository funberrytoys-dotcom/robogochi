(() => {
  'use strict';
  const game=document.getElementById('game'), habitat=document.getElementById('habitat');
  const world=document.getElementById('world'), shrouds=document.getElementById('shrouds');
  const planes=[...habitat.querySelectorAll('.depth-plane')];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const lights=[
    [[.035,.48],[.11,.44],[.17,.50],[.225,.455],[.285,.49],[.35,.475],[.41,.504],[.867,.587],[.91,.601]],
    [[.56,.321],[.66,.292],[.725,.356],[.80,.325],[.87,.278],[.94,.375],[.975,.24],[.059,.311],[.092,.302]],
    [[.04,.182],[.125,.111],[.20,.154],[.28,.075],[.365,.188],[.425,.132],[.55,.082],[.814,.09],[.854,.103],[.102,.665],[.132,.672]]
  ];
  const maskWidth=112,maskHeight=168;
  const banks=lights.map((points,i)=>{
    const el=document.createElement('div'),image=new Image();
    const bank={el,alpha:null,clearedAt:-Infinity};
    el.className='mist-bank';image.alt='';image.decoding='async';
    image.onload=()=>{
      const canvas=document.createElement('canvas');
      canvas.width=maskWidth;canvas.height=maskHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,maskWidth,maskHeight);
      bank.alpha=ctx.getImageData(0,0,maskWidth,maskHeight).data;
    };
    image.src=groveAsset('assets/mist/bank-'+(i+1)+'.webp');el.append(image);
    points.forEach(([x,y],j)=>{
      const fly=document.createElement('i');fly.className='mist-glimmer';
      fly.style.cssText='left:'+x*100+'%;top:'+y*100+'%;--cycle:'+(2.4+(i+j)%4*.55)+'s;--delay:-'+((j+1)*.63)+'s';
      el.append(fly);
    });
    shrouds.append(el);return bank;
  });
  let opened=0;
  function setView(count,zoom,dx,dy){
    planes.forEach((plane,i)=>{
      const depth=i===0?.19:.48;
      plane.style.setProperty('--pan-x',dx*depth*100+'%');
      plane.style.setProperty('--pan-y',dy*depth*100+'%');
      plane.style.setProperty('--zoom',1+(zoom-1)*depth);
    });
    if(opened===count)return;
    banks.forEach((bank,i)=>{
      const clear=i+2<=count;
      if(clear && opened && !bank.el.classList.contains('discovered'))bank.clearedAt=performance.now();
      bank.el.classList.toggle('discovered',clear);
      // Fully unlocked saves start in daylight on their first rendered frame.
      if(!opened && clear)bank.el.hidden=true;
    });
    opened=count;
  }
  function wildlifeMask(canvas){
    if(opened===4 && performance.now()-banks[2].clearedAt>1100)return null;
    const rect=world.getBoundingClientRect(), origin=canvas.getBoundingClientRect();
    const left=rect.left-origin.left,top=rect.top-origin.top,time=performance.now();
    return (x,y)=>{
      const u=Math.floor((x-left)/rect.width*maskWidth),v=Math.floor((y-top)/rect.height*maskHeight);
      if(u<0||u>=maskWidth||v<0||v>=maskHeight)return false;
      const p=(v*maskWidth+u)*4+3;
      return banks.some((bank,i)=>(i+2>opened || time-bank.clearedAt<1000) && bank.alpha && bank.alpha[p]>55);
    };
  }
  let x=0,y=0,targetX=0,targetY=0,time=0,prev=0,frame=0,anchor=null;
  const limit=v=>Math.min(1,Math.max(-1,v));
  function look(e){
    if(reduce.matches || !document.getElementById('overlay').hidden)return;
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
  window.GroveDepth={setView,wildlifeMask};
})();
