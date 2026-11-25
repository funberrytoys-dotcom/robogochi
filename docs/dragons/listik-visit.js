(() => {
  'use strict';
  const nearPlane=document.querySelector('#near-plane');
  const field=document.querySelector('#habitat');
  const overlay=document.querySelector('#overlay');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas');
  canvas.className='listik-visit';
  canvas.setAttribute('aria-hidden','true');
  canvas.hidden=true;
  nearPlane.before(canvas);
  const ctx=canvas.getContext('2d');
  const skeleton=ListikPassage.wingAndTailPose(rigData);
  const camera=[0,0];
  let renderer,loading,active=false,timer,frame;
  let night=new URLSearchParams(location.search).get('sky')==='night';
  window.addEventListener('grove-atmosphere',e=>{night=e.detail.phase>=.82;});

  function load(){
    const atlas=new Image();
    atlas.src=groveAsset('assets/flight/listik-glide-skin.webp');
    return atlas.decode().then(()=>createListikRenderer(atlas,rigData,{volume:true,width:960}));
  }
  function stop(){
    cancelAnimationFrame(frame);
    canvas.hidden=true;active=false;
  }
  function schedule(delay){
    clearTimeout(timer);
    if(!document.hidden && !reduced.matches)timer=setTimeout(visit,delay);
  }
  async function visit(){
    if(active)return;
    if(reduced.matches || document.hidden || !overlay.hidden){schedule(8000);return;}
    active=true;
    try{
      loading??=load();
      renderer??=await loading;
    }catch{
      loading=null;stop();schedule(41000);return;
    }
    if(document.hidden || reduced.matches || !active){stop();return;}
    const start=performance.now();
    // Near the nest the dragon actually disappears behind its branches.
    if(field.dataset.view==='near')nearPlane.before(canvas);else nearPlane.after(canvas);
    canvas.hidden=false;
    function draw(now){
      const t=(now-start)/1000;
      if(t>=ListikPassage.visitDuration || document.hidden || reduced.matches || !overlay.hidden){
        stop();schedule(38000);return;
      }
      const cssWidth=canvas.clientWidth,cssHeight=canvas.clientHeight;
      const density=Math.min(devicePixelRatio||1,1.75);
      const w=Math.round(cssWidth*density),h=Math.round(cssHeight*density);
      if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
      const pose=ListikPassage.encounter(t);
      const {flight,roll,yaw,pitch,proximity}=pose;
      const air=night?[.18,.28,.42,.26-.15*proximity]:[.48,.62,.65,.26-.20*proximity];
      const dragon=renderer(flight,0,1,camera,
        (matrices,view)=>skeleton(pose,t,matrices,view),[roll,yaw,.98],air);
      const view=field.dataset.view;
      const span=view==='near'?1.02:view==='valley'?.56:.81;
      const drawWidth=w*span*(.43+.63*proximity);
      ctx.clearRect(0,0,w,h);ctx.save();
      ctx.translate(pose.x*w,(pose.y+(view==='valley'?.048:0))*h);
      ctx.rotate(pitch);
      ctx.drawImage(dragon,-drawWidth/2,-drawWidth*.3,drawWidth,drawWidth*.6);
      ctx.restore();
      frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
  }
  document.querySelector('#tree-heart').addEventListener('click',visit);
  const restart=()=>{stop();schedule(11000);};
  document.addEventListener('visibilitychange',restart);
  reduced.addEventListener('change',restart);
  schedule(11000);
})();
