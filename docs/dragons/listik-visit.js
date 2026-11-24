(() => {
  'use strict';
  const nearPlane = document.querySelector('#near-plane');
  const world = document.querySelector('#world');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'listik-visit';
  canvas.setAttribute('aria-hidden','true');
  canvas.hidden = true;
  nearPlane.after(canvas);
  const ctx = canvas.getContext('2d');
  let renderer, loading, active = false, timer;

  function load(){
    const atlas = new Image();
    atlas.src = groveAsset('assets/flight/listik-glide-skin.webp');
    return atlas.decode().then(() => createListikRenderer(atlas,rigData));
  }

  async function visit(){
    clearTimeout(timer);
    if(!active && !reduced.matches && !document.hidden){
      active = true;
      try {
        loading ??= load();
        renderer ??= await loading;
        if(!document.hidden && !reduced.matches){
          const start = performance.now();
          canvas.hidden = false;
          requestAnimationFrame(now => draw(now,start));
        }else active = false;
      }catch{
        canvas.remove();
        return;
      }
    }
    timer = setTimeout(visit,41000);
  }

  function draw(now,start){
    const t = (now-start)/1000;
    const {duration,ease,pose} = ListikPassage;
    if(t>duration || document.hidden || reduced.matches){
      canvas.hidden = true;
      active = false;
      return;
    }
    const density = Math.min(window.devicePixelRatio||1,1.3);
    const w = Math.max(1,Math.round(canvas.clientWidth*density));
    const h = Math.max(1,Math.round(canvas.clientHeight*density));
    if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.clearRect(0,0,w,h);
    const {flight,camera,bank,yaw} = pose(t);
    const dragon = renderer(flight,0,1,camera,null,[-.06-.28*bank,yaw,.65]);
    const route = t/duration;
    const box=world.getBoundingClientRect(), view=canvas.getBoundingClientRect();
    const x=(box.left-view.left+box.width*(1.40-1.92*(route+.031*Math.sin(2*Math.PI*route))))*density;
    const y=(box.top-view.top+box.height*(.548-.139*ease(0,duration,t)-.019*bank))*density;
    const scale=box.width*density*(.00072+.00008*bank-.00012*ease(4.02,duration,t));
    ctx.save();
    ctx.globalAlpha = .94;
    ctx.translate(x,y);
    ctx.rotate(-.024-.073*bank);
    ctx.scale(scale,scale);
    ctx.drawImage(dragon,-600,-310);
    ctx.restore();
    requestAnimationFrame(next => draw(next,start));
  }

  document.querySelector('#tree-heart').addEventListener('click',visit);
  timer = setTimeout(visit,10000);
})();
