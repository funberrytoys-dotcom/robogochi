(() => {
  'use strict';
  const {s,names,families,ages,sprite,save,current,growth}=Grove;
  const $=id=>document.getElementById(id);
  const panel=$('panel'), overlay=$('overlay'), hero=$('hero');
  const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const needs=[['food','Сытость','berry'],['energy','Бодрость','moon'],['clean','Чистота','drop'],['fun','Радость','heart']];
  const sounds={tap:'click',sparkle:'school',miss:'fail'};
  const sound=name=>DragonAudio.play(sounds[name]||name);
  const activeEgg=()=>s.focus==='egg'&&s.eggs[0];
  let cleanup=null, returnFocus=null,toastTimer,reactionTimer,animTimer,hatchBusy=false;
  const header=(kicker,title)=>'<div class="sheet-head"><div><div class="eyebrow">'+kicker+'</div><h2>'+title+'</h2></div><button class="circle" data-close aria-label="Закрыть">'+glyph('close')+'</button></div>';
  function modal(title){
    clearTimeout(toastTimer);$('toast').classList.remove('on');
    if(!cleanup&&overlay.hidden)returnFocus=document.activeElement;
    cleanup?.();cleanup=null;panel.replaceChildren();overlay.hidden=false;panel.setAttribute('aria-label',title);panel.focus();panel.scrollTop=0;
  }
  function close(){
    cleanup?.();cleanup=null;overlay.hidden=true;panel.replaceChildren();render();
    (returnFocus?.isConnected?returnFocus:hero).focus({preventScroll:true});
    returnFocus=null;
  }
  function toast(text){$('toast').textContent=text;$('toast').classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('on'),3100);}
  function react(text){const el=$('reaction');el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(reactionTimer);reactionTimer=setTimeout(()=>el.classList.remove('show'),1520);}
  const dragonCues={cuddle:'♥',purr:'Мур-р-р…',growl:'Р-р-р…',angry:'Фыр!',bite:'Щёлк!'};
  function creatureCue(pose){
    sound('dragon-'+pose);
    if(dragonCues[pose])react(dragonCues[pose]);
    if(pose==='lift')$('reaction').classList.remove('show');
    if(['purr','growl','bite','lift','release'].includes(pose))GroveHUD.cue(pose);
  }
  function bounce(){hero.classList.remove('touched');void hero.offsetWidth;hero.classList.add('touched');clearTimeout(animTimer);animTimer=setTimeout(()=>hero.classList.remove('touched'),650);}
  function flourish(icon,color){
    if(reduced.matches)return;
    for(let i=0;i<5;i++){
      const fx=document.createElement('i');fx.className='care-fx';fx.innerHTML=glyph(icon);
      fx.style.cssText='--dx:'+((i-2)*29)+'px;--dy:'+(-38-Math.sin(i*.8)*38)+'px;--rot:'+((i-2)*12)+'deg;--fx:'+color+';animation-delay:'+(i*.043)+'s';
      $('scene-fx').append(fx);setTimeout(()=>fx.remove(),1450);
    }
  }
  function splitShell(){
    if(reduced.matches)return;
    for(const side of ['left','right']){const piece=new Image();piece.src=groveAsset('assets/grove-v2/egg.webp');piece.className='fx-shell '+side;$('scene-fx').append(piece);setTimeout(()=>piece.remove(),850);}
    flourish('spark','#ffda85');
  }
  function audioUI(){const on=DragonAudio.enabled();$('audio-toggle').innerHTML=glyph(on?'sound':'mute');$('audio-toggle').setAttribute('aria-label',on?'Выключить звук':'Включить звук');$('audio-toggle').setAttribute('aria-pressed',String(on));}
  $('audio-toggle').onclick=()=>{DragonAudio.toggle();audioUI();};
  $('wallet').onclick=()=>openMenu('shop');
  GroveHUD.mount();
  $('menu').onclick=e=>{const b=e.target.closest('[data-page]');if(b)openMenu(b.dataset.page);};

  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  $('world').onclick=e=>{
    const b=e.target.closest('[data-friend]');
    if(!b||hatchBusy)return;
    s.focus=b.dataset.friend;save();render();
    if(Habitat.islandName(s.focus))GroveCamera.centerHome();
    sound('pet');react('♥');
  };
  function render(){
    const d=current(),egg=activeEgg();
    if(!d&&!egg){s.focus=s.eggs.length?'egg':s.dragons[0]?.id;if(s.focus){save();return render();}return;}
    $('balance').textContent=s.coins;
    $('ornaments').innerHTML=s.equipped.map(id=>'<img class="decor-'+id+'" src="'+groveAsset('assets/decor/'+id+'.webp')+'" alt="">').join('');
    Habitat.refresh();hero.classList.remove('egg','warm-0','warm-1','warm-2','baby','teen','adult','sleep');
    if(egg)hero.classList.add('egg','warm-'+egg.warmth);
    else {hero.classList.add(['baby','teen','adult'][d.stage]);hero.classList.toggle('sleep',d.sleeping);}
    const src=egg?groveAsset('assets/grove-v2/egg.webp'):sprite(d.species,d.stage,d.sleeping?'sleep':'idle');
    if($('hero-img').getAttribute('src')!==src)$('hero-img').src=src;
    DragonStage.setDragon(egg?null:d);
    hero.setAttribute('aria-label',egg?'Согреть яйцо':'Погладить дракона · '+d.name);
    if(egg)GroveHUD.egg({warmth:egg.warmth});
    else GroveHUD.pet({name:d.name,stage:ages[d.stage],sprite:src,sleeping:d.sleeping,canGrow:d.stage<2&&growth(d)>=1,hasCommand:Object.keys(d.tricks).length>0});
    window.GroveForage?.sync();
  }
  function plural(n,forms){return forms[n%100>10&&n%100<20?2:n%10===1?0:n%10>=2&&n%10<=4?1:2];}
  function warm(){
    if(!activeEgg()||hatchBusy)return;
    const hatch=Grove.warm();
    if(!hatch){render();sound('egg');bounce();react(activeEgg().warmth===1?'✧':'✧ ✧');return;}
    hatchBusy=true;Branches.event('hatch');sound('hatch');render();GroveAir.stir(hero);splitShell();bounce();react('✦');
    setTimeout(()=>{hatchBusy=false;if(overlay.hidden)arrival(hatch);},970);
  }
  function arrival(d){
    modal('Вылупление');panel.innerHTML='<div class="sheet stack born-card">'+header(d.stage===2?'ОСОБОЕ ВЫЛУПЛЕНИЕ':'ПЕРВАЯ ВСТРЕЧА',d.stage===2?'Большой дракон!':'Дракоша вылупился!')+'<img class="pet-portrait" src="'+sprite(d.species,d.stage)+'" alt="'+families[d.species]+' дракон"><p>'+families[d.species]+' дракон осваивается в гнезде. Как его назвать?</p><form id="name-form" class="stack"><input class="field" id="pet-name" aria-label="Имя дракона" maxlength="20"><button class="gold">Домой, на древо</button></form></div>';
    bindName(d,true);
  }
  function bindName(d,welcome=false){
    $('pet-name').value=d.name;
    $('name-form').onsubmit=e=>{e.preventDefault();d.name=$('pet-name').value.trim().slice(0,20)||names[d.species];save();sound('pet');close();react('♥');
      if(welcome && window.GroveForage && Branches.count()===1 && hero.dataset.treeSeat==='0')toast('Сорви ягоду с ветки и коснись дракоши.');};
  }
  function care(action){
    if(action==='warm'){warm();return;}
    const d=current();if(!d)return;
    if(action==='profile'){profile(d);return;}
    if(d.sleeping&&action!=='sleep'){toast('Дракон дремлет. Чтобы поиграть, разбудите его.');return;}
    if(action==='command'){treeCommand(d);return;}
    const change={pet:['fun',16,'pet','♥'],feed:['food',22,'feed','Ням!'],wash:['clean',24,'pet','Кап-кап!']};
    if(action==='sleep'){
      d.sleeping=!d.sleeping;save();render();
      sound(d.sleeping?'sleep':d.stage===0?'cartoon-vocal-yawn':'pet');
      react(d.sleeping?'Zzz…':'Доброе утро!');return;
    }
    const item=change[action];if(!item)return;
    const [stat,amount,fx,words]=item,before=d.needs[stat];
    d.needs[stat]=Math.min(100,before+amount);if(before<96)d.xp+=2;
    save();if(action==='feed'||action==='pet')Branches.event('care');render();
    if(action==='feed')window.ResidentMotion?.feed();
    if(action==='pet'){
      const pose=d.needs.fun>=78?'purr':'cuddle';
      DragonStage.express(pose,1300);creatureCue(pose);
    }else{
      sound(fx);react(words);
      bounce();
    }
    GroveAir.stir(hero);
    flourish({feed:'berry',wash:'drop',pet:'heart'}[action],{feed:'#f9b4ae',wash:'#9feef3',pet:'#ffbecd'}[action]);
  }
  $('dock').onclick=e=>{const b=e.target.closest('[data-care]');if(b)care(b.dataset.care);};
  DragonStage.configure({stroke:()=>care('pet'),cue:creatureCue});
  hero.onclick=e=>{if(e.detail&&DragonStage.consumesClick())return;if(activeEgg())warm();else care('pet');};
  function treeCommand(d){
    modal('Команда на ветке');
    panel.innerHTML='<div class="sheet stack">'+header(escapeHTML(d.name.toLocaleUpperCase('ru')),'Команда на ветке')+'<form id="command-on-branch" class="stack"><label for="phrase">Какую команду подать?</label><input class="field" id="phrase" autocomplete="off" maxlength="42"><button class="gold">Подать команду</button></form><div id="known" class="actions"></div><div id="response" class="msg" role="status"></div></div>';
    const perform=words=>{
      const trick=DragonActivities.matchCommand(words,d);
      if(!trick){$('response').textContent='Дракон пока не узнаёт эту команду.';sound('fail');return;}
      close();sound('school');hero.classList.add('trick-'+trick);
      setTimeout(()=>hero.classList.remove('trick-'+trick),1400);
      flourish(trick==='glow'?'spark':trick==='spin'?'leaf':'heart',trick==='glow'?'#ffe199':'#e9cdab');react({hop:'Прыг!',spin:'Пируэт!',glow:'✧ ✦ ✧'}[trick]);
    };
    for(const phrase of Object.values(d.tricks)){const b=document.createElement('button');b.className='soft';b.textContent=phrase;b.onclick=()=>perform(phrase);$('known').append(b);}
    $('command-on-branch').onsubmit=e=>{e.preventDefault();perform($('phrase').value);};
  }
  function profile(d){
    modal('Паспорт дракона');const percent=Math.round(100*growth(d));
    panel.innerHTML='<div class="sheet stack">'+header('ПАСПОРТ ДРАКОНА',escapeHTML(d.name))+
      '<div class="evo-line">'+ages.map((label,i)=>'<div class="evo-card '+(i===d.stage?'active':'')+'"><img src="'+sprite(d.species,i)+'" alt=""><b>'+label+'</b></div>').join('')+'</div>'+
      '<div class="care-meters">'+needs.map(([k,label,icon])=>'<span>'+glyph(icon)+label+' · '+Math.round(d.needs[k])+'%</span>').join('')+'</div>'+
      '<div><h3>'+ (d.stage===2?'Большой дракон':percent>=100?'Пора вырасти!':'До следующей стадии')+'</h3><div class="growth-bar"><i style="width:'+percent+'%"></i></div><p>'+ (d.stage===2?'Все стадии пройдены.':percent+'% · Забота, игры и время помогают расти.')+'</p></div>'+
      '<p>Дружба · '+d.xp+' &nbsp; Выучено трюков · '+Object.keys(d.tricks).length+'</p>'+
      (d.stage<2&&growth(d)>=1?'<button class="gold" id="evolve">'+glyph('spark')+'Эволюция</button>':'')+
      '<form class="stack" id="name-form"><div><label for="pet-name">Имя</label><div class="name-line"><input class="field" id="pet-name" maxlength="20"><button class="soft">Сохранить</button></div></div></form></div>';
    bindName(d);if($('evolve'))$('evolve').onclick=()=>{if(d.stage<2&&growth(d)>=1){d.stage++;save();sound('evolve');close();bounce();react(ages[d.stage]+'!');}};
  }
  function invitationSheet(title){
    modal(title);
    panel.innerHTML='<div class="sheet stack forage-sheet">'+header('ЦВЕТОК НА ВЕТВИ',title)+'<div class="forage-choices"></div></div>';
    return panel.querySelector('.forage-choices');
  }
  function collection(){
    const cards=s.dragons.map(d=>{
      const island=Habitat.islandName(d.id);
      return '<button class="dragon-card '+(d.id===s.focus?'active':'')+'" data-id="'+d.id+'"><img src="'+sprite(d.species,d.stage)+'" alt=""><b>'+escapeHTML(d.name)+'</b><small>'+ages[d.stage]+(island?' · '+island:'')+'</small></button>';
    });
    modal('Коллекция');panel.innerHTML='<div class="sheet stack">'+header('ЖИТЕЛИ ДОЛИНЫ','Коллекция')+
      (cards.length?'<div class="collection-grid">'+cards.join('')+'</div>':'<p>Первый житель пока в скорлупе. Согрейте яйцо в гнезде.</p>')+
      (s.eggs.length?'<button class="soft" id="eggs">'+glyph('egg')+'К гнезду · '+s.eggs.length+'</button>':'')+
      '<hr><h3>Семейства ToysBerry</h3><div class="collection-grid">'+families.map((f,i)=>'<button class="dragon-card" data-family="'+i+'"><img src="'+sprite(i,2)+'" alt=""><b>'+f+'</b></button>').join('')+'</div>'+
      '<button class="soft" id="add-toy">'+glyph('qr')+'Добавить игрушку</button></div>';
    panel.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{s.focus=b.dataset.id;save();close();sound('pet');profile(current());});
    panel.querySelectorAll('[data-family]').forEach(b=>b.onclick=()=>family(Number(b.dataset.family)));
    if($('eggs'))$('eggs').onclick=()=>{s.focus='egg';save();close();};$('add-toy').onclick=()=>openMenu('qr');
  }
  function family(i){
    modal('Семейство');panel.innerHTML='<div class="sheet stack">'+header('АТЛАС ДРАКОНОВ',families[i])+
      '<div class="evo-line">'+ages.map((a,j)=>'<div class="evo-card"><img src="'+sprite(i,j)+'" alt=""><b>'+a+'</b></div>').join('')+'</div>'+
      (i<2?'<h3>Из игрушки в игру</h3><div class="toy-pair"><figure><img src="'+groveAsset('assets/dragons/toy-'+(i===0?'leaf':'ember')+'.webp')+'" alt="Фотография игрушки"><figcaption>Игрушка ToysBerry</figcaption></figure><figure><img src="'+sprite(i,2)+'" alt="Большой дракон из игры"><figcaption>Дракон на древе</figcaption></figure></div>':'')+
      '<button class="soft" id="back-collection">Вернуться в коллекцию</button></div>';$('back-collection').onclick=collection;
  }
  function shop(){
    const missing = Math.max(0, Grove.eggPrice - s.coins);
    const eggCard = '<div class="shop-card"><img src="'+groveAsset('assets/grove-v2/egg.webp')+'" alt=""><b>Таинственное яйцо</b>'+
      '<p>Внутри — случайный дракон.</p><button class="gold" id="buy-egg" '+(missing?'disabled':'')+'>'+glyph('pollen')+' Купить за '+Grove.eggPrice+'</button>'+
      (missing?'<small>Ещё '+missing+' пыльцы</small>':'')+'</div>';
    modal('Лесная лавка');panel.innerHTML='<div class="sheet stack">'+header('ЯЙЦА И УКРАШЕНИЯ','Лесная лавка')+'<p>У вас '+s.coins+' пыльцы. Её дают за игры и задания Светика.</p>'+eggCard+'<div class="shop-grid">'+Grove.decor.map(({id,name,price})=>{
      const owned=s.owned.includes(id),equipped=s.equipped.includes(id);
      return '<div class="shop-card"><img src="'+groveAsset('assets/decor/'+id+'.webp')+'" alt=""><b>'+name+'</b><button class="'+(owned?'soft':'gold')+'" data-buy="'+id+'" '+(!owned&&price>s.coins?'disabled':'')+'>'+ (owned?(equipped?'Снять':'Разместить'):glyph('pollen')+' '+price)+'</button></div>';
    }).join('')+'</div><p>Украшения меняют вид вашего древа.</p></div>';
    $('buy-egg').onclick=()=>{
      if(!Grove.buyEgg())return;
      close();sound('coin');toast('Таинственное яйцо ждёт в гнезде.');
    };
    panel.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
      const item=Grove.decor.find(x=>x.id===b.dataset.buy),owned=s.owned.includes(item.id);
      if(!owned){if(s.coins<item.price)return;s.coins-=item.price;s.owned.push(item.id);}
      if(s.equipped.includes(item.id))s.equipped=s.equipped.filter(x=>x!==item.id);else s.equipped.push(item.id);
      save();sound('coin');render();shop();
    });
  }
  function openMenu(kind){
    if(hatchBusy)return;sound('click');
    if(kind==='collection')return collection();
    if(kind==='shop')return shop();
    if(kind==='qr'){
      modal('QR игрушки');cleanup=ToyQR.open({panel,header,finish:()=>{sound('coin');close();toast('Яйцо игрушки ждёт в гнезде.');}});return;
    }
    const d=current()||s.dragons.at(-1);
    if(!d){toast('Сначала помогите дракону вылупиться.');bounce();return;}
    if(d.sleeping){toast('Разбудите дракона перед занятием.');return;}
    s.focus=d.id;save();render();modal(kind==='school'?'Школа драконов':'Лесные игры');
    cleanup=DragonActivities.open(kind,{root:panel,dragon:d,sprite:sprite(d.species,d.stage),sound,onClose:close,onPerform:()=>Branches.event('lesson'),onReward:({coins=0,xp=0,trick,phrase})=>{
      if(trick&&Object.hasOwn(d.tricks,trick))return;
      if(trick)d.tricks[trick]=phrase;
      Branches.event(trick?'lesson':'game');
      s.coins+=coins;d.xp+=xp;d.needs.fun=Math.min(100,d.needs.fun+8);save();render();
    }});
  }
  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-close]'))close();});
  document.addEventListener('keydown',e=>{
    if(overlay.hidden)return;
    if(e.key==='Escape'){if(!panel.querySelector('.da-header')){e.preventDefault();close();}return;}
    if(e.key==='Tab'){
      const buttons=[...panel.querySelectorAll('button:not(:disabled), input:not([type=file]), summary, [tabindex="0"]')].filter(b=>b.getClientRects().length);
      if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  const entry=ToyQR.token(location.href);if(entry){const problem=Grove.redeem(entry);toast(problem||'Яйцо вашей игрушки в гнезде.');}
  window.GroveForage?.configure({feed:()=>care('feed'),sound,toast,invitationSheet,close,
    nest:()=>{s.focus='egg';save();render();GroveCamera.centerHome();}});
  Branches.initialize(Grove);
  window.addEventListener('grove-branches-changed',()=>{render();GroveAir.stir(hero);});
  audioUI();render();
  setInterval(()=>{Grove.tick(document.hidden);save();if(overlay.hidden&&!hatchBusy&&!document.activeElement?.closest('#dock'))render();},15000);
  document.addEventListener('visibilitychange',()=>{Grove.tick(true);save();});
})();
