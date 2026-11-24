(() => {
  window.groveAsset=path=>window.GROVE_FILES?.[path]||path;
  const params = new URLSearchParams(location.search);
  const showcase=params.get('showcase');
  const key = 'toysberry.dragon-tree.'+(showcase==='rigs'?'atlas.':showcase==='grove'?'showcase.':params.get('journey')==='nest'?'first-bough.':'')+'v1';
  const names = ['Листик','Искорка','Капля','Слива','Зорька','Лучик', ...DragonRig.families.map(row=>row.name)];
  const families = ['Цветущий','Огненный','Росистый','Лунный','Коралловый','Солнечный', ...DragonRig.families.map(row=>row.family)];
  const ages = ['Малыш','Подросток','Большой дракон'];
  const forms = ['baby','teen','adult'];
  const codes = Object.fromEntries(['LEAF','EMBER','DEW','LILAC','PEACH','SUN'].map((color,i)=>['TB-'+color+'-01',{species:i}]));
  codes['TB-BLOOM-02']={species:0,adult:true};
  codes['TB-FLAME-02']={species:1,adult:true};
  const decor = [
    {id:'lantern',name:'Жёлудь-фонарик',price:18},
    {id:'blossoms',name:'Колокольчики',price:24},
    {id:'mushrooms',name:'Лунные грибы',price:32}
  ];
  const decay = {food:1.1,energy:0.8,clean:0.5,fun:1.4};
  const now = () => Date.now();
  function makeEgg(code='') {
    const toy = codes[code];
    return {code, species:toy?.species ?? Math.floor(Math.random()*families.length), stage:toy?.adult || Math.random()<0.035 ? 2 : 0, warmth:0};
  }
  function fresh() {
    const s={v:1, coins:30, dragons:[], eggs:[makeEgg()], focus:'egg', redeemed:[], owned:[], equipped:[], last:now()};
    if(showcase==='grove'||showcase==='rigs'){
      s.eggs=[];s.owned=['lantern','blossoms'];s.equipped=[...s.owned];s.coins=38;
      const lineup=showcase==='rigs'?DragonRig.families.map((_,i)=>[i+6,i%3]):[[0,2],[1,0],[2,1],[3,0]];
      s.dragons=lineup.map(([species,stage],i)=>({
        id:'grove-'+i,species,stage,name:names[species],born:now()-Math.max(0,3-i)*86400000,xp:[48,18,31,6][i]??20,
        tricks:i===0?{hop:'Прыгни!'}:{},needs:{food:70,energy:81,clean:73,fun:65},sleeping:false,source:''
      }));
      s.focus=s.dragons[0].id;
    }
    return s;
  }
  function load() {
    try {
      const s=JSON.parse(localStorage.getItem(key));
      if(s?.v===1 && Array.isArray(s.eggs) && Array.isArray(s.dragons)) return s;
    } catch {}
    return fresh();
  }
  const s=load();
  function save(){try{localStorage.setItem(key, JSON.stringify(s));}catch{}}
  function liveNeeds(d,minutes,away) {
    for(const [need,rate] of Object.entries(decay)){
      if(need==='energy' && d.sleeping){d.needs.energy=Math.min(100,d.needs.energy+minutes*14);continue;}
      const floor=away?Math.min(d.needs[need],22):0;
      d.needs[need]=Math.max(floor,d.needs[need]-minutes*rate*(away?0.5:1)*(d.sleeping&&need==='fun'?0.2:1));
    }
    if(d.needs.energy>=99.5) d.sleeping=false;
  }
  function tick(away=false) {
    const t=now(), elapsed=Math.max(0,Math.min((t-s.last)/60000,600));
    for(const d of s.dragons) liveNeeds(d,elapsed,away);
    s.last=t;
  }
  const current=()=>s.dragons.find(d=>d.id===s.focus);
  const eggPrice = 38;
  function buyEgg() {
    if (s.coins < eggPrice) return false;
    const egg = makeEgg();
    s.coins -= eggPrice;
    s.eggs.push(egg);
    s.focus = 'egg';
    save();
    return true;
  }
  function redeem(code) {
    if(!Object.hasOwn(codes,code))return 'Такого кода нет в коллекции прототипа.';
    if(s.redeemed.includes(code))return 'Это яйцо уже получено на вашем древе.';
    const egg=makeEgg(code);
    if(s.eggs.length===1&&!s.eggs[0].code&&!s.dragons.length)s.eggs[0]=egg;
    else s.eggs.push(egg);
    s.redeemed.push(code);s.focus='egg';save();return '';
  }
  function warm() {
    const egg=s.eggs[0];
    if(!egg)return;
    if(++egg.warmth<3){save();return;}
    const d={id:globalThis.crypto?.randomUUID?.()||String(now())+'-'+Math.random(),species:egg.species,stage:egg.stage,name:names[egg.species],born:now(),xp:0,tricks:{},needs:{food:58,energy:78,clean:62,fun:50},sleeping:false,source:egg.code};
    s.eggs.shift();s.dragons.push(d);s.focus=d.id;save();return d;
  }
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  function sprite(species,stage,pose='idle') {
    if(species>=6)return DragonStage.portrait(species,stage,pose==='happy'?'cuddle':pose);
    const form=pose==='happy'?'happy':forms[stage];
    const prefix=pose==='sleep'?'sleep-':reducedMotion.matches?'still-':'';
    return groveAsset('assets/characters-v2/'+prefix+form+'-'+species+'.webp');
  }
  // Дружба ускоряет рост. Спустя сутки и трое суток стадии доступны и при редких визитах.
  function growth(d) {
    if(d.stage===2)return 1;
    const ageHours=Math.max(0,now()-d.born)/3600000;
    return Math.min(1,Math.max(d.xp/[18,45][d.stage],ageHours/[24,72][d.stage]));
  }
  tick(true);save();
  window.Grove={s,names,families,ages,codes,decor,eggPrice,buyEgg,save,tick,current,redeem,warm,sprite,growth};
})();
