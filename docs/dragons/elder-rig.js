(() => {
  'use strict';
  const svg = document.querySelector('#elder-rig');
  const world = document.querySelector('#world');
  const overlay = document.querySelector('#overlay');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  function element(name, attributes) {
    const node = document.createElementNS(ns, name);
    for (const [key,value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }
  const bones = new Map();
  const skins = [];
  let night = new URLSearchParams(location.search).get('sky') === 'night';
  for (const [name,parent,px,py,amplitude,x,y,width,height] of elderParts) {
    const group = element('g', {'data-bone':name});
    const joint = {group,px,py,amplitude,parent:bones.get(parent),matrix:new DOMMatrix()};
    bones.set(name,joint);
    (joint.parent?.group || svg).append(group);
    const source = groveAsset('assets/depth/spring/rig/'+name+'.svg');
    const art = element('image', {x,y,width,height,href:source+(night?'#moon':'')});
    skins.push({art,source});group.append(art);
  }
  window.addEventListener('grove-atmosphere',event=>{
    const next=event.detail.phase>=.82;
    if(next===night)return;
    night=next;
    for(const {art,source} of skins)art.setAttribute('href',source+(night?'#moon':''));
  });
  // Sprays share their supporting limb's motion before bending at their own stem.
  const foliage = [
    ['nursery','sprig',247,940,19,-6], ['nursery','bell-vine',292,962,18,7],
    ['nursery','sprig',313,944,27,12], ['nursery-tip','bell-vine',83,984,22,-5],
    ['bole','bell-vine',307,764,33,-5], ['high-perch','bell-vine',198,403,29,8],
    ['east-perch','bell-vine',794,669,27,4], ['lower-perch','sprig',738,1072,26,5],
    ['lower-perch','bell-vine',702,1108,37,8], ['crown-top','bell-vine',606,195,35,3],
    ['roots','sprig',227,1333,30,-6], ['leader','sprig',375,504,27,12]
  ];
  foliage.forEach(([parent,type,x,y,width,angle],i) => {
    const joint=element('g',{transform:'translate('+x+' '+y+') rotate('+angle+')'});
    const stem=element('g',{'data-stem':type});
    const hanging=type==='bell-vine', height=width*(hanging?94/44:60/64);
    stem.append(element('image',{x:-width*(hanging?.36:.95), y:hanging?0:-height*.91,
      width,height,href:groveAsset('assets/depth/spring/'+type+'.svg')}));
    joint.append(stem);bones.get(parent).group.append(joint);
    stem.style.setProperty('--phase',(-i*.83)+'s');
  });
  for(const [parent,x,y,width] of [
    ['nursery',206,931,33],['nursery',291,934,25],['nursery-tip',86,938,30],
    ['east-perch',705,631,26],['lower-perch',771,1056,30],['high-perch',167,369,22]
  ]) {
    bones.get(parent).group.append(element('image',{x,y,width,height:width*50/160,
      href:groveAsset('assets/depth/spring/moss-garden.svg')}));
  }
  const mounts=['nursery','lower-perch','east-perch','high-perch','crown-east','leader','roots'];
  const attachments=new Map();
  function attach(node,index,x,y) {
    if(node)attachments.set(node,{joint:bones.get(mounts[index]),x:x*10.24,y:y*15.36});
  }
  function bind(){
    attachments.clear();
    const [x,y]=GroveCamera.mounts[0];
    for(const nest of world.querySelectorAll('.nursery-nest'))attach(nest,0,x,y);
    for(const node of world.querySelectorAll('[data-tree-seat]')){
      const i=Number(node.dataset.treeSeat);
      if(i>=0)attach(node,i,...GroveCamera.mounts[i]);
      else node.style.removeProperty('translate');
    }
  }
  let scale=1,handle=0,last=0,clock=0,gust=0;
  new ResizeObserver(entries=>{scale=entries[0].contentRect.width/1024;}).observe(world);
  function pose() {
    let step=0;
    for (const joint of bones.values()) {
      const {group,parent,px,py,amplitude}=joint;
      const t=clock-step*.17;
      const wind=(Math.sin(t*.82)+.32*Math.sin(t*1.51+.7))*.78;
      const angle=motion.matches?0:amplitude*(wind+gust*Math.sin(t*2.1));
      joint.matrix=(parent?.matrix || new DOMMatrix()).translate(px,py).rotate(angle).translate(-px,-py);
      if(amplitude)group.setAttribute('transform','rotate('+angle.toFixed(3)+' '+px+' '+py+')');
      step++;
    }
    for(const [node,{joint,x,y}] of attachments){
      const m=joint.matrix;
      node.style.translate=((m.a*x+m.c*y+m.e-x)*scale).toFixed(2)+'px '+((m.b*x+m.d*y+m.f-y)*scale).toFixed(2)+'px';
    }
  }
  function frame(now){
    handle=requestAnimationFrame(frame);
    if(now-last<32)return;
    const dt=Math.min(.08,(now-last)/1000);last=now;
    if(!overlay.hidden)return;
    clock+=dt;gust=Math.max(0,gust-dt*.48);pose();
  }
  function restart(){
    cancelAnimationFrame(handle);last=performance.now();pose();
    if(!document.hidden&&!motion.matches)handle=requestAnimationFrame(frame);
  }
  document.querySelector('#tree-heart').addEventListener('click',()=>{gust=2.1;});
  document.addEventListener('visibilitychange',restart);motion.addEventListener('change',restart);
  window.ElderRig={bind};bind();restart();
})();
