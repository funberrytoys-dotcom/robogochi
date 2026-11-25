import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const canvas=document.querySelector('#field'), mood=document.querySelector('#mood'), more=document.querySelector('#more');
const flightButton=document.querySelector('[data-do="Flight"]'),liftButton=document.querySelector('[data-do="Held"]');
const aud=window.DragonAudio, soundButton=document.querySelector('#sound');
function soundLabel(){soundButton.textContent=aud.enabled()?'Звук вкл.':'Звук выкл.';soundButton.setAttribute('aria-pressed',String(aud.enabled()));}
soundButton.onclick=()=>{aud.toggle();soundLabel();};soundLabel();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const labels={Idle:'На острове',Walk:'Гуляет',Takeoff:'Взлетает',Flight:'В воздухе',Land:'Садится',Yawn:'Зевает',Pet:'Урчит',Held:'На руках',Growl:'Рычит',Bite:'Кусает'};
const sounds={Yawn:'cartoon-vocal-yawn',Pet:'dragon-purr',Held:'dragon-lift',Growl:'dragon-growl',Bite:'dragon-bite',Land:'dragon-release'};
const easing=t=>t*t*(3-2*t);
async function playIsland(){
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setClearColor(0,0);
  const scene=new T.Scene(), camera=new T.OrthographicCamera(-1,1,1,-1,.01,35);
  const aim=new T.Vector3(0,.31,0);camera.position.copy(aim).add(new T.Vector3(3.32,.99,3.25));camera.lookAt(aim);camera.updateMatrixWorld();
  const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
  const up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
  const toCamera=camera.position.clone().sub(aim).normalize();
  const sun=new T.DirectionalLight(0xffe8c4,1.20);sun.position.set(2.7,5,3);
  scene.add(sun,new T.HemisphereLight(0xfff6de,0xc5c4af,1.87));
  const loader=new T.TextureLoader();
  async function billboard(url,width,alpha=1){
    const tex=await loader.loadAsync(url);tex.colorSpace=T.SRGBColorSpace;
    const obj=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,opacity:alpha,depthWrite:false,toneMapped:false}));
    obj.scale.set(width,width*tex.image.height/tex.image.width,1);scene.add(obj);return obj;
  }
  const [gltf,island,far,cloud]=await Promise.all([
    new GLTFLoader().loadAsync('listik.glb'),billboard('../assets/depth/detail/roost-west.webp',2.88),
    billboard('../assets/depth/biplanes-green-01.webp',.39,.82),billboard('../assets/depth/biplanes-cloud-03.webp',.73,.40)]);
  // Locate the grassy landing surface, at 21% of this existing island image.
  island.center.set(.46,.789);island.position.addScaledVector(toCamera,-.53);island.renderOrder=-2;
  far.renderOrder=-4;cloud.renderOrder=-3;
  const plane=document.createElement('canvas');plane.width=plane.height=64;
  const ctx=plane.getContext('2d'),g=ctx.createRadialGradient(32,32,1,32,32,32);
  g.addColorStop(0,'rgba(14,34,26,.55)');g.addColorStop(1,'rgba(14,34,26,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const shadow=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(plane),transparent:true,depthWrite:false}));
  shadow.renderOrder=-1;scene.add(shadow);
  const carrier=new T.Group();scene.add(carrier);const actor=gltf.scene;carrier.add(actor);
  const eyes=[], mixer=new T.AnimationMixer(actor);
  const gradient=new T.DataTexture(new Uint8Array([119,164,214,242]),4,1,T.RedFormat);
  gradient.minFilter=gradient.magFilter=T.NearestFilter;gradient.needsUpdate=true;
  const pigment=new T.MeshToonMaterial({vertexColors:true,gradientMap:gradient,side:T.DoubleSide});
  actor.traverse(mesh=>{if(mesh.isMesh){mesh.material=pigment;mesh.frustumCulled=false;if(mesh.morphTargetDictionary?.Blink!==undefined)eyes.push(mesh);}});
  const actions=Object.fromEntries(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
  let current,state,age=0,time=0,wait=10,auto=0,h=0,x=0,fromX=0,toX=0,fromH=0,walkTime=0;
  let goalX=0,goalH=.45,dx=0,dh=0,lean=0,face=0,dir=1,autonomousFlight=false;
  const pointers=new Map();let grip=false,holdTimer,pokes=0,lastPoke=0;
  function stateTo(next,fx=true){
    if(!actions[next])return;
    const prev=current;current=actions[next];
    if(prev!==current)prev?.fadeOut(.13);
    current.reset().setEffectiveWeight(1).fadeIn(prev?.13:0);
    const loop=['Idle','Flight','Walk','Held'].includes(next);
    current.setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);current.clampWhenFinished=!loop;current.play();
    state=next;age=0;fromH=h;fromX=x;
    mood.textContent=labels[next];canvas.dataset.state=next;
    flightButton.textContent=['Flight','Takeoff'].includes(next)?'Сесть':'Взлететь';
    liftButton.textContent=next==='Held'?'Отпустить':'Взять на руки';
    if(next==='Idle')wait=9+Math.random()*6;
    if(fx&&sounds[next])aud.play(sounds[next]);
  }
  function groundAction(name){
    autonomousFlight=false;
    if(name==='Held'){
      if(state==='Held'){grip=false;stateTo('Land');return;}
      goalX=x;goalH=Math.max(h,.38);stateTo('Held');return;
    }
    if(name==='Flight'){
      if(state==='Flight'||state==='Takeoff'){stateTo('Land');return;}
      stateTo('Takeoff');return;
    }
    if(state==='Flight'||state==='Takeoff'||state==='Held'||state==='Land'){
      pending=name;grip=false;stateTo('Land');return;
    }
    if(name==='Walk'){toX=Math.abs(toX-x)>.04?toX:dir*(.10+Math.random()*.12);dir*=-1;walkTime=Math.max(.55,Math.abs(toX-x)/.21);}
    stateTo(name);
  }
  let pending=null;
  mixer.addEventListener('finished',e=>{
    if(e.action!==current)return;
    if(state==='Takeoff')stateTo('Flight',false);
    else if(state==='Land'){h=0;stateTo('Idle',false);if(pending){const a=pending;pending=null;groundAction(a);}}
    else stateTo('Idle',false);
  });
  document.querySelectorAll('[data-do]').forEach(b=>b.onclick=()=>{
    more.open=false;pending=null;toX=x;groundAction(b.dataset.do);
  });
  let zoomGoal=1;const overview=document.getElementById('view');
  overview.onclick=()=>{const wide=overview.getAttribute('aria-pressed')!=='true';overview.setAttribute('aria-pressed',String(wide));overview.textContent=wide?'К Листику':'Весь остров';zoomGoal=wide?.45:1;};
  function size(){
    const {clientWidth:w,clientHeight:height}=canvas;
    renderer.setSize(w,height,false);
    const aspect=w/height, half=Math.max(.79,.715/aspect);
    Object.assign(camera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});
    camera.setViewOffset(w,height,0,-height*.043,w,height);camera.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(canvas);size();
  const ray=new T.Raycaster();
  function coord(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)/b.width,y:(e.clientY-b.top)/b.height};}
  function hit(p){
    ray.setFromCamera({x:p.x*2-1,y:1-p.y*2},camera);
    return ray.intersectObject(actor,true).length>0;
  }
  let firstX=0,firstY=0,grabX=0,grabH=0;
  function centroid(){
    const active=[...pointers.values()];return active.reduce((a,p)=>({x:a.x+p.x/active.length,y:a.y+p.y/active.length}),{x:0,y:0});
  }
  function grab(){
    if(!pointers.size||grip)return;
    clearTimeout(holdTimer);const center=centroid();firstX=center.x;firstY=center.y;grabX=x;grabH=Math.max(.10,h);
    goalX=x;goalH=grabH;grip=true;pending=null;stateTo('Held');
    if(navigator.vibrate)navigator.vibrate(15);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    more.open=false;let p=coord(e);p.hit=hit(p);p.startX=p.x;p.startY=p.y;
    pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);
    if(pointers.size===2 && [...pointers.values()].some(q=>q.hit)){grab();return;}
    if(pointers.size===1 && p.hit)holdTimer=setTimeout(grab,400);
  });
  canvas.addEventListener('pointermove',e=>{
    let p=pointers.get(e.pointerId);if(!p)return;Object.assign(p,coord(e));
    if(!grip && Math.hypot(p.x-p.startX,p.y-p.startY)>.018){clearTimeout(holdTimer);if(p.hit)grab();}
    if(grip){
      const q=centroid();goalX=T.MathUtils.clamp(grabX+(q.x-firstX)*(camera.right-camera.left),-camera.right*.68,camera.right*.68);
      goalH=T.MathUtils.clamp(grabH+(firstY-q.y)*(camera.top-camera.bottom),.07,camera.top*.71);
    }
  });
  function release(e,cancel){
    const p=pointers.get(e.pointerId);if(!p)return;clearTimeout(holdTimer);pointers.delete(e.pointerId);
    if(grip){grip=false;pointers.clear();pending=null;stateTo('Land');return;}
    if(cancel||pointers.size)return;
    if(p.hit){
      pokes=time-lastPoke<1.35?pokes+1:1;lastPoke=time;
      groundAction(pokes>=4?'Bite':pokes===3?'Growl':'Pet');if(pokes>=4)pokes=0;
    } else if(p.y>.46&&p.y<.76){
      toX=T.MathUtils.clamp((p.x-.5)*2*camera.right,-.32,.32);groundAction('Walk');
    }
  }
  canvas.addEventListener('pointerup',e=>release(e,false));
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>release(e,true));
  const stars=[];
  for(let i=0;i<11;i++){
    const s=new T.Sprite(new T.SpriteMaterial({color:i%3?0xffeb9b:0xf3d2a5,transparent:true,depthWrite:false,map:null,opacity:.6}));
    s.scale.setScalar(.0055+(i%3)*.0013);stars.push(s);scene.add(s);
  }
  let last=performance.now();
  function tick(now){
    const dt=Math.min(.075,(now-last)/1000);last=now;time+=dt;age+=dt;
    if(Math.abs(camera.zoom-zoomGoal)>.001){camera.zoom=T.MathUtils.lerp(camera.zoom,zoomGoal,1-Math.exp(-7*dt));camera.updateProjectionMatrix();}
    mixer.update(dt);
    if(state==='Idle'&&age>wait){
      auto++;
      if(auto%5===4){autonomousFlight=true;stateTo('Takeoff');}
      else if(auto%3===1)stateTo('Yawn');
      else{toX=x>.02?-.16:.16;groundAction('Walk');}
    }
    if(state==='Flight'&&autonomousFlight&&age>3.8){autonomousFlight=false;stateTo('Land');}
    if(state==='Walk'){const p=Math.min(1,age/walkTime);x=T.MathUtils.lerp(fromX,toX,easing(p));face=toX<fromX?-.3:1.65;if(p===1)stateTo('Idle',false);}
    else if(state==='Takeoff'){h=T.MathUtils.lerp(fromH,.32,easing(Math.min(1,age/.70)));}
    else if(state==='Flight'){
      h=.32+.066*Math.sin(age*2.6);x=fromX+.16*Math.sin(age*1.8);face=.18*Math.cos(age*1.8);
    } else if(state==='Land'){
      const p=Math.min(1,age/.70);h=fromH*(1-easing(p));x=T.MathUtils.lerp(fromX,T.MathUtils.clamp(fromX,-.31,.31),easing(p));
    } else if(state==='Held'){
      const factor=1-Math.exp(-17*dt),oldX=x;x+=(goalX-x)*factor;h+=(goalH-h)*factor;
      dx=(x-oldX)/Math.max(.001,dt);dh+=((-.25*dx-lean)*38-dh*7)*dt;lean+=dh*dt;
    } else if(state!=='Walk'){face=0;}
    if(state!=='Held'){lean*=Math.exp(-8*dt);dh=0;}
    carrier.position.copy(right).multiplyScalar(x);carrier.position.y+=h;
    actor.rotation.y=T.MathUtils.lerp(actor.rotation.y,face,1-Math.exp(-8*dt));
    carrier.quaternion.setFromAxisAngle(toCamera,lean+(state==='Flight'?.045*Math.sin(age*2.3):0));
    shadow.position.copy(right).multiplyScalar(x).addScaledVector(toCamera,-.025);
    shadow.scale.set(.65*(1-h*.55),.105*(1-h*.6),1);shadow.material.opacity=Math.max(.16,1-h*1.65);
    const blink=Math.max(0,1-Math.abs((time%3.7)-3.47)/.11);
    const yawn=state==='Yawn'?Math.sin(Math.PI*Math.min(1,age/1.9))**4:0;
    for(const eye of eyes)eye.morphTargetInfluences[eye.morphTargetDictionary.Blink]=Math.max(blink,yawn*.91);
    far.position.copy(right).multiplyScalar(-camera.right*.68).addScaledVector(up,.65+.012*Math.sin(time*.35)).addScaledVector(toCamera,-1.8);
    cloud.position.copy(right).multiplyScalar(camera.right*(.60+.08*Math.sin(time*.08))).addScaledVector(up,.71).addScaledVector(toCamera,-1.3);
    stars.forEach((s,i)=>{s.visible=!reduced.matches;s.position.copy(right).multiplyScalar(camera.right*Math.sin(i*8.61+time*.11)).addScaledVector(up,.06+(i%6)*.115+.034*Math.sin(i+time*.9)).addScaledVector(toCamera,-.4);
      s.material.opacity=.36+.32*Math.sin(time*1.6+i);});
    renderer.render(scene,camera);
  }
  function resume(){
    last=performance.now();if(document.hidden){clearTimeout(holdTimer);if(grip){grip=false;pointers.clear();stateTo('Land',false);}}
    renderer.setAnimationLoop(document.hidden?null:tick);
  }
  stateTo('Idle',false);document.addEventListener('visibilitychange',resume);resume();
}
playIsland().catch(error=>{console.error(error);mood.textContent='Не удалось открыть остров';document.querySelector('#hint').textContent='Перезагрузи страницу в браузере с поддержкой WebGL 2.';});
