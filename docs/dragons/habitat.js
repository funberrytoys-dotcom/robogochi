(() => {
  const world=document.querySelector('#world'),field=document.querySelector('#habitat');
  const branches=document.querySelector('#boughs'),stops=document.querySelector('#stops'),camera=document.querySelector('#overview');
  const names=['Гнездо','Цветущая ветвь','Ветвь светляков','Солнечная крона'];
  const mounts=[[47.5,74.5],[25.2,52.7],[73,36.2],[30.8,18.5]];
  const nest=[47.5,74.5];
  let overview=false,lastScene='',lastCount=0;
  function slot(d,count){
    const stored=Number.isInteger(d.bough)?d.bough:Grove.s.dragons.findIndex(row=>row.id===d.id);
    return Math.min(count-1,Math.max(0,stored));
  }
  function seats(count){
    const groups=Array.from({length:count},()=>[]);
    Grove.s.dragons.forEach(d=>groups[slot(d,count)].push(d));
    const map=new Map();
    groups.forEach((group,index)=>{
      group.forEach((d,i)=>{
        const [cx,cy]=mounts[index], spread=group.length>1?Math.min(21/(group.length-1),12):0;
        map.set(d.id,{index,x:cx+(i-(group.length-1)/2)*spread,y:cy-(i%2)*1.3});
      });
    });
    return map;
  }
  function refresh(){
    const count=Branches.count(),s=Grove.s,d=Grove.current(),egg=s.focus==='egg',places=seats(count);
    const active=egg?{x:nest[0],y:nest[1],index:0}:places.get(d?.id)||{x:nest[0],y:nest[1],index:0};
    world.style.setProperty('--home-x',active.x+'%');world.style.setProperty('--home-y',active.y+'%');
    world.style.setProperty('--nest-x',nest[0]+'%');world.style.setProperty('--nest-y',nest[1]+'%');
    const key=[count,s.focus,...s.dragons.map(x=>x.id+'.'+x.stage+'.'+slot(x,count)+'.'+x.name+'.'+x.sleeping)].join('/');
    if(count!==lastCount){
      branches.replaceChildren();
      for(let i=1;i<count;i++){const layer=new Image();layer.src=groveAsset('assets/ancient-tree/branch-'+i+'.webp');layer.className='bough-layer';layer.alt='';branches.append(layer);}
      lastCount=count;
    }
    if(key!==lastScene){
      lastScene=key;const occupied=new Set([...places.values()].map(p=>p.index));if(egg)occupied.add(0);
      const rl=document.querySelector('#residents');rl.replaceChildren();stops.replaceChildren();
      s.dragons.filter(row=>row.id!==s.focus).forEach(row=>{
        const pos=places.get(row.id),b=document.createElement('button'),pic=new Image();b.className='perch';b.dataset.friend=row.id;b.title=row.name;b.setAttribute('aria-label','Позвать дракона · '+row.name);
        b.style.left=pos.x+'%';b.style.top=pos.y+'%';b.style.width=[17,19,22][row.stage]+'%';
        if(egg&&pos.index===0)b.style.left=Math.min(86,pos.x+16)+'%';
        pic.src=Grove.sprite(row.species,row.stage,row.sleeping?'sleep':'idle');pic.alt='';b.append(pic);rl.append(b);
      });
      for(let i=0;i<count;i++){
        if(occupied.has(i)||!d)continue;
        const b=document.createElement('button');b.className='perch-stop';b.style.left=mounts[i][0]+'%';b.style.top=mounts[i][1]+'%';
        b.setAttribute('aria-label','Перелететь · '+names[i]);b.title='Перелететь · '+names[i];b.innerHTML=glyph('leaf');b.onclick=()=>{d.bough=i;Grove.save();window.dispatchEvent(new Event('grove-branches-changed'));};stops.append(b);
      }
    }
    const near=count===4?overview:!overview;
    const label=near?'Осмотреть древо':'Приблизиться к дракону';
    camera.title=label;camera.setAttribute('aria-label',label);camera.setAttribute('aria-pressed',String(overview));
    const zoom=near?[1.65,1.34,1.13,1.5][count-1]:1;
    const dx=Math.max(1-zoom,Math.min(0,.50-(active.x/100)*zoom));
    const dy=Math.max(1-zoom,Math.min(0,.59-(active.y/100)*zoom));
    world.style.setProperty('--camera-z',zoom);world.style.setProperty('--camera-x',dx*100+'%');world.style.setProperty('--camera-y',dy*100+'%');
    field.dataset.boughs=count;field.dataset.view=near?'near':'wide';
  }
  camera.onclick=()=>{overview=!overview;refresh();};
  window.Habitat={refresh};
})();
