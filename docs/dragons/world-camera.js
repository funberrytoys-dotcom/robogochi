(() => {
  'use strict';
  const field = document.querySelector('#habitat');
  const world = document.querySelector('#world');
  const button = document.querySelector('#overview');
  const overlay = document.querySelector('#overlay');
  const mounts = [[25.9,60.55],[78,68.8],[80.5,41.2],[23,24.3],[86,28.5],[35,33],[23.5,86.1]];
  const views={valley:1.47,tree:2.85,near:11.15,roots:1.96};
  const points = new Map();
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  let width, height, base, zoom = 1, x = 0, y = 0;
  const initialView = new URLSearchParams(location.search).get('view');
  let mode = ['tree','valley','roots'].includes(initialView) ? initialView : 'near', home = mounts[0], gesture, suppressUntil = 0;

  function layout(){
    const w = base*zoom, h = w*1.5;
    if(mode==='roots'){x=width*.48-w*.48;y=height*.72-h*.944;}
    else if(mode==='tree'||mode==='valley'){x=(width-w)/2;y=(height-h)/2+(mode==='valley'?height*.045:4);}
    else if(zoom<=1){
      const inset=(width-w)/2,sweep=width*(1-zoom)*1.28;
      x=clamp(x,inset-sweep,inset+sweep);
      y=clamp(y,(height-h)/2-height*.08,(height-h)/2+height*.08);
    }else{
      const pad = Math.min(width*.21,(zoom-1)*width*.15);
      x = clamp(x,Math.min((width-w)/2,width-w*1.44-pad),Math.max((width-w)/2,w*.42+pad));
      y = h<height?(height-h)/2:clamp(y,height-h-pad,pad+height*.105);
    }
    world.style.width = w+'px';
    world.style.height = h+'px';
    world.style.setProperty('--world-transform',`translate3d(${x}px,${y}px,0)`);
    const view=zoom<1.85?'valley':zoom<3.5?'tree':'near';
    field.dataset.view = view;
    button.title = {near:'Осмотреть древо',tree:'Осмотреть долину',valley:'Вернуться к дракону'}[view];
    button.setAttribute('aria-label',button.title);
    field.dispatchEvent(new Event('grove-camera-changed'));
    GroveDepth.setView(zoom,(x+base*zoom/2-width*.5)/width,(y+base*.75*zoom-height*.5)/height);
  }

  function frame(){
    zoom = mode==='near' && (home[0]<0 || home[0]>100) ? 5.15 : views[mode];
    const [hx,hy] = home;
    const nest=hx===mounts[0][0]&&hy===mounts[0][1];
    x = width*(nest?.40:.48)-hx/100*base*zoom;
    y = height*.65-hy/100*base*1.5*zoom;
    layout();
  }

  function resize(){
    const w = field.clientWidth, h = field.clientHeight;
    if(!w||!h)return;
    if(mode==='free')mode = field.dataset.view;
    width=w;height=h;
    base=Math.min(width*.96,height*.83/1.5);
    frame();
  }

  function focus(point){
    const changed = home[0]!==point[0] || home[1]!==point[1];
    home = point;
    if(!base)resize();
    else if(changed && (mode==='near' || point[0]<0 || point[0]>100))centerHome();
  }

  function revealBranch(index){
    const point=mounts[index];
    if(!point)return;
    zoom=3.55;mode='free';
    x=width*.53-point[0]/100*base*zoom;
    y=height*.51-point[1]/100*base*1.5*zoom;
    layout();
  }
  function centerHome(){mode='near';frame();}

  function local(event){
    const rect=field.getBoundingClientRect();
    return {x:event.clientX-rect.left,y:event.clientY-rect.top};
  }

  function pair(){
    const [a,b]=points.values();
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,span:Math.hypot(a.x-b.x,a.y-b.y)};
  }

  function zoomAt(z,point,origin){
    zoom=clamp(z,.47,12.8);
    x=point.x-origin.x*zoom;
    y=point.y-origin.y*zoom;
    mode='free';layout();
  }

  function capture(id){
    if(!field.hasPointerCapture(id))field.setPointerCapture(id);
  }

  field.addEventListener('pointerdown',e=>{
    if(e.button!==0 || !overlay.hidden)return;
    const point=local(e);
    points.set(e.pointerId,{...point,start:point,draggable:!e.target.closest('button')});
    if(points.size!==2)return;
    const m=pair();
    gesture={span:Math.max(1,m.span),zoom,origin:{x:(m.x-x)/zoom,y:(m.y-y)/zoom}};
    points.forEach((_,id)=>capture(id));
    field.dataset.gesture='pinch';
    suppressUntil=Infinity;
  },true);
  field.addEventListener('pointermove',e=>{
    const previous=points.get(e.pointerId);
    if(!previous)return;
    const next=local(e);
    points.set(e.pointerId,{...previous,...next});
    if(points.size>=2 && gesture){
      const m=pair();zoomAt(gesture.zoom*m.span/gesture.span,m,gesture.origin);
    }else if(!gesture && previous.draggable){
      const dx=next.x-previous.start.x,dy=next.y-previous.start.y;
      if(!field.dataset.gesture && Math.hypot(dx,dy)<8)return;
      field.dataset.gesture='drag';capture(e.pointerId);mode='free';
      x+=next.x-previous.x;y+=next.y-previous.y;layout();
    }
  },true);
  function release(e){
    if(!points.delete(e.pointerId))return;
    if(points.size)return;
    if(field.dataset.gesture)suppressUntil=performance.now()+350;
    gesture=undefined;delete field.dataset.gesture;
  }
  window.addEventListener('pointerup',release,true);
  window.addEventListener('pointercancel',release,true);
  field.addEventListener('click',e=>{
    if(e.detail&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  field.addEventListener('wheel',e=>{
    if(!overlay.hidden)return;
    e.preventDefault();
    const point=local(e);
    zoomAt(zoom*Math.exp(-clamp(e.deltaY,-180,180)*.0035),point,{x:(point.x-x)/zoom,y:(point.y-y)/zoom});
  },{passive:false});
  function nextView(){
    mode={near:'tree',tree:'valley',valley:'near'}[field.dataset.view];frame();
  }
  let mapTouch, lastMapTap=-Infinity;
  button.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse')mapTouch={id:e.pointerId,x:e.clientX,y:e.clientY};
  });
  button.addEventListener('pointerup',e=>{
    if(mapTouch?.id!==e.pointerId)return;
    const tap=Math.hypot(e.clientX-mapTouch.x,e.clientY-mapTouch.y)<10;
    mapTouch=undefined;
    if(tap){lastMapTap=performance.now();nextView();}
  });
  button.addEventListener('pointercancel',()=>{mapTouch=undefined;});
  button.addEventListener('click',e=>{
    if(!e.detail||performance.now()-lastMapTap>420)nextView();
  });
  new ResizeObserver(resize).observe(field);
  function cancelInput(){points.clear();gesture=undefined;delete field.dataset.gesture;}
  window.GroveCamera={mounts,focus,centerHome,cancelInput,revealBranch};
})();
