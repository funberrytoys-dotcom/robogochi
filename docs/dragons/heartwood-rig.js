(() => {
  'use strict';
  const field=document.querySelector('#habitat'),world=document.querySelector('#world');
  const fallback=document.querySelector('#elder-rig'),heart=document.querySelector('#tree-heart');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas');canvas.className='wood-skin';canvas.setAttribute('aria-hidden','true');
  fallback.after(canvas);
  let draw=null,clock=0,last=0,raf=0,gust=0;
  let darkness=new URLSearchParams(location.search).get('sky')==='night'?1:0;
  const attachments=new Map();
  function bind(){
    attachments.clear();
    const assign=(node,x,y)=>{attachments.set(node,{x,y,skin:LivingWood.influences(x,y)});};
    for(const node of world.querySelectorAll('.nursery-nest')){
      const [x,y]=GroveCamera.mounts[0];assign(node,x*10.24,y*15.36);
    }
    for(const node of world.querySelectorAll('[data-tree-seat]')){
      const mount=GroveCamera.mounts[Number(node.dataset.treeSeat)];
      if(mount)assign(node,mount[0]*10.24,mount[1]*15.36);
      else node.style.removeProperty('translate');
    }
  }
  function render(){
    const fieldRect=field.getBoundingClientRect(),rect=world.getBoundingClientRect();
    if(!rect.width)return;
    LivingWood.pose(clock,gust,motion.matches);
    const phase=(clock/2.9)%1;
    const beat=motion.matches?.50:.17+Math.exp(-Math.pow((phase-.29)/.114,2))*.88+
      Math.exp(-Math.pow((phase-.52)/.145,2))*.47+Math.min(.62,gust*.26);
    heart.style.setProperty('--beat',beat.toFixed(3));
    if(draw){
      draw(fieldRect,rect,darkness,beat);
      field.classList.add('skinned-wood');
      for(const [node,{x,y,skin}] of attachments){
        const [dx,dy]=LivingWood.sample(x,y,skin);
        node.style.translate=(dx*rect.width/1024).toFixed(2)+'px '+(dy*rect.width/1024).toFixed(2)+'px';
      }
    }
  }
  function tick(now){
    raf=requestAnimationFrame(tick);
    if(now-last<22)return;
    const dt=Math.min(.12,(now-last)/1000);last=now;
    if(!document.querySelector('#overlay').hidden)return;
    clock+=dt;gust=Math.max(0,gust-dt*.65);render();
  }
  function restart(){
    cancelAnimationFrame(raf);last=performance.now();
    if(document.hidden)return;
    render();if(!motion.matches)raf=requestAnimationFrame(tick);
  }
  function touch(){gust=2.9;restart();}
  heart.addEventListener('click',touch);
  window.addEventListener('grove-forage-awaken',touch);
  window.addEventListener('grove-atmosphere',e=>{darkness=e.detail.phase>=.82?1:0;field.dataset.light=darkness?'night':'day';restart();});
  new ResizeObserver(restart).observe(world);
  field.addEventListener('grove-camera-changed',()=>{if(motion.matches)requestAnimationFrame(render);});
  motion.addEventListener('change',restart);document.addEventListener('visibilitychange',restart);
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();draw=null;field.classList.remove('skinned-wood');
    for(const node of attachments.keys())node.style.removeProperty('translate');
  });
  function load(){LivingWood.mount(canvas).then(paint=>{draw=paint;restart();}).catch(error=>console.warn('Древо использует резервную иллюстрацию',error));}
  canvas.addEventListener('webglcontextrestored',load);
  window.ElderRig={bind};bind();restart();load();
})();
