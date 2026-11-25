(() => {
  const world=document.querySelector('#world'),field=document.querySelector('#habitat');
  const stops=document.querySelector('#stops');
  const names=['Гнездо','Цветущая ветвь','Ветвь светляков','Золотой уступ','Солнечная крона','Тропа к сердцу','Корни Древа'];
  const mounts=GroveCamera.mounts,nest=mounts[0];
  const islands=[
    {name:'Западный остров',x:-23,y:55,width:29,asset:'roost-west'},
    {name:'Восточный остров',x:124,y:68,width:29,asset:'roost-east'},
    {name:'Верхний остров',x:117,y:29,width:24,asset:'roost-upper'},
  ];
  let lastScene='', places=new Map();
  const landscape=document.querySelector('#island-homes');
  const islandButtons=islands.map(({name,x,y,width,asset})=>{
    const island=document.createElement('button'),art=new Image();
    island.className='island-home';island.type='button';island.title=name;island.disabled=true;
    island.style.left=x+'%';island.style.top=y+'%';island.style.width=width+'%';
    art.src=groveAsset('assets/depth/detail/'+asset+'.webp');art.alt='';
    island.append(art);landscape.append(island);return island;
  });
  function seats(count){
    const map=new Map(),occupied=new Set(),overflow=[];
    const occupy=(d,index)=>{
      const [x,y]=mounts[index];
      map.set(d.id,{index,x,y});occupied.add(index);
    };
    for(const d of Grove.s.dragons){
      if(Number.isInteger(d.bough)&&d.bough>=0&&d.bough<count&&!occupied.has(d.bough))occupy(d,d.bough);
    }
    for(const d of Grove.s.dragons){
      if(map.has(d.id))continue;
      const free=mounts.findIndex((_,i)=>i<count&&!occupied.has(i));
      if(free===-1)overflow.push(d);else occupy(d,free);
    }
    overflow.forEach((d,i)=>{
      const index=i%islands.length,{x,y}=islands[index];
      const row=Math.floor(i/islands.length), residents=Math.ceil((overflow.length-index)/islands.length);
      const spacing=residents>1?Math.min(5,14/(residents-1)):0;
      map.set(d.id,{index:-1,island:index,x:x+(row-(residents-1)/2)*spacing,y:y-(row%2)*.56});
    });
    return map;
  }
  function refresh(){
    const count=Branches.count(),s=Grove.s,d=Grove.current(),egg=s.focus==='egg';
    places=seats(count);
    const active=egg?{x:nest[0],y:nest[1],index:0}:places.get(d?.id)||{x:nest[0],y:nest[1],index:0};
    world.style.setProperty('--home-x',active.x+'%');world.style.setProperty('--home-y',active.y+'%');
    world.style.setProperty('--nest-x',nest[0]+'%');world.style.setProperty('--nest-y',nest[1]+'%');
    const key=[count,s.focus,...s.dragons.map(d=>[d.id,d.stage,d.bough,d.name,d.sleeping].join('.'))].join('/');
    GroveFog.setCount(count);
    if(key!==lastScene){
      lastScene=key;const occupied=new Set([...places.values()].map(p=>p.index));if(egg)occupied.add(0);
      const rl=document.querySelector('#residents'),hero=document.querySelector('#hero');
      hero.dataset.treeSeat=active.index;
      hero.toggleAttribute('data-island-home',active.island!==undefined);
      islandButtons.forEach((button,index)=>{
        const resident=s.dragons.find(row=>places.get(row.id)?.island===index);
        button.disabled=!resident;
        if(resident)button.dataset.friend=resident.id;else delete button.dataset.friend;
        button.setAttribute('aria-label',islands[index].name+(resident?' · '+resident.name:''));
      });
      rl.replaceChildren();stops.replaceChildren();
      s.dragons.filter(row=>row.id!==s.focus).forEach(row=>{
        const pos=places.get(row.id),b=document.createElement('button'),pic=new Image();b.className='perch';b.dataset.friend=row.id;b.title=row.name;b.setAttribute('aria-label','Позвать дракона · '+row.name);
        b.dataset.treeSeat=pos.index;
        if(pos.island!==undefined){
          b.dataset.islandHome=String(pos.island);
          b.title=row.name+' · '+islands[pos.island].name;
          b.setAttribute('aria-label',b.title);
        }
        b.style.left=pos.x+'%';b.style.top=pos.y+'%';b.style.width=[2.6,4,6][row.stage]+'%';
        if(egg&&pos.index===0)b.style.left=(pos.x+4)+'%';
        pic.src=Grove.sprite(row.species,row.stage,row.sleeping?'sleep':'idle');pic.alt='';b.append(pic);rl.append(b);
      });
      for(let i=0;i<count;i++){
        if(occupied.has(i)||!d)continue;
        const b=document.createElement('button');b.className='perch-stop';b.style.left=mounts[i][0]+'%';b.style.top=mounts[i][1]+'%';
        b.dataset.treeSeat=i;
        b.setAttribute('aria-label','Перелететь · '+names[i]);b.title='Перелететь · '+names[i];b.innerHTML=glyph('leaf');b.onclick=()=>{d.bough=i;Grove.save();window.dispatchEvent(new Event('grove-branches-changed'));};stops.append(b);
      }
    }
    window.ElderRig?.bind();
    GroveCamera.focus([active.x,active.y]);
    field.dataset.boughs=count;
  }
  function islandName(id){return islands[places.get(id)?.island]?.name;}
  window.Habitat={refresh,islandName};
})();
