(() => {
  'use strict';
  const {s,names,families,ages,sprite,save,current,growth}=Grove;
  const $=id=>document.getElementById(id);
  const panel=$('panel'), overlay=$('overlay'), hero=$('hero');
  const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const menu=[
    ['school','Школа','book','#746c9c','#504b78'],['games','Игры','games','#5b9291','#366f74'],
    ['collection','Коллекция','collection','#70966b','#436d57'],['shop','Лавка','shop','#ae8964','#81604c'],
    ['qr','QR игрушки','qr','#537d85','#3c626b']
  ];
  const needs=[['food','Сытость','berry'],['energy','Бодрость','moon'],['clean','Чистота','drop'],['fun','Радость','heart']];
  const sounds={tap:'click',sparkle:'school',miss:'fail'};
  const sound=name=>DragonAudio.play(sounds[name]||name);
  const activeEgg=()=>s.focus==='egg'&&s.eggs[0];
  let cleanup=null, returnFocus=null,toastTimer,reactionTimer,animTimer,expressionTimer,hatchBusy=false;
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
  $('menu').innerHTML=menu.map(([key,name,icon,c1,c2])=>'<button class="nav-btn" data-page="'+key+'" style="--tile:'+c1+';--tile2:'+c2+'"><i>'+glyph(icon)+'</i><span>'+name+'</span></button>').join('');
  $('menu').onclick=e=>{const b=e.target.closest('[data-page]');if(b)openMenu(b.dataset.page);};
  for(let i=0;i<29;i++){const dot=document.createElement('i');dot.style.cssText='left:'+((i*47+13)%98)+'%;top:'+((i*31+17)%84+5)+'%;animation-delay:'+(-i*.41)+'s';$('motes').append(dot);}
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  if(matchMedia('(pointer:fine)').matches&&!reduced.matches){
    $('game').addEventListener('pointermove',e=>{if(!overlay.hidden)return;$('game').style.setProperty('--mx',((e.clientX/innerWidth-.5)*7)+'px');$('game').style.setProperty('--my',((e.clientY/innerHeight-.5)*4)+'px');});
  }
  function renderResidents(){
    const perches=[[23.6,44.4],[74.8,53.2],[64,29.7],[68,86],[33,87],[81,92],[16.5,43],[86,51]];
    const others=s.dragons.filter(d=>d.id!==s.focus);
    $('residents').innerHTML=others.slice(0,perches.length).map((d,i)=>{
      const [x,y]=perches[i];return '<button class="perch" data-friend="'+d.id+'" title="'+escapeHTML(d.name)+'" aria-label="Позвать '+escapeHTML(d.name)+'" style="left:'+x+'%;top:'+y+'%;width:'+(i<3?14:10)+'%"><img src="'+sprite(d.species,d.stage,d.sleeping?'sleep':'idle')+'" alt=""></button>';
    }).join('');
  }
  $('residents').onclick=e=>{const b=e.target.closest('[data-friend]');if(b&&!hatchBusy){s.focus=b.dataset.friend;save();render();sound('pet');react('♥');}};
  function render(){
    const d=current(),egg=activeEgg();
    if(!d&&!egg){s.focus=s.eggs.length?'egg':s.dragons[0]?.id;if(s.focus){save();return render();}return;}
    $('balance').textContent=s.coins;
    $('ornaments').innerHTML=s.equipped.map(id=>'<img class="decor-'+id+'" src="'+groveAsset('assets/decor/'+id+'.webp')+'" alt="">').join('');
    renderResidents();hero.className=egg?'egg warm-'+egg.warmth:['baby','teen','adult'][d.stage]+(d.sleeping?' sleep':'');
    const src=egg?groveAsset('assets/grove-v2/egg.webp'):sprite(d.species,d.stage,d.sleeping?'sleep':'idle');
    if($('hero-img').getAttribute('src')!==src)$('hero-img').src=src;
    hero.setAttribute('aria-label',egg?'Согреть яйцо':'Погладить дракона · '+d.name);
    $('chapter').textContent=egg?(s.dragons.length?'НОВОЕ ЯЙЦО':'ПЕРВОЕ ГНЕЗДО'):'МОЯ РОЩА';
    $('location').textContent=egg?'Лесная роща':s.dragons.length+' '+plural(s.dragons.length,['дракон','дракона','драконов'])+' на древе';
    if(egg){
      const titles=['Кто-то внутри…','Яйцо шевелится','Скорлупа трещит'];
      const hints=['Согрейте яйцо ладонью.','Коснитесь его ещё раз.','Помогите дракону выбраться.'];
      $('dock').innerHTML='<div class="dock-badge">'+glyph('egg')+'</div><div class="dock-copy"><h2>'+titles[egg.warmth]+'</h2><p>'+hints[egg.warmth]+'</p><div class="warmth" aria-label="Тепло '+egg.warmth+' из 3">'+[0,1,2].map(i=>'<i class="'+(i<egg.warmth?'on':'')+'"></i>').join('')+'</div></div><button class="gold" data-care="warm">'+glyph('hand')+(egg.warmth===2?'Вылупить':'Согреть')+'</button>';
    }else{
      const actions=[['feed','berry','Угостить'],['pet','heart','Гладить'],['wash','drop','Умыть'],['sleep','moon',d.sleeping?'Разбудить':'Уложить']];
      if(Object.keys(d.tricks).length)actions.push(['command','spark','Команда']);
      $('dock').innerHTML='<button class="dock-copy pet-profile" data-care="profile" aria-label="Паспорт '+escapeHTML(d.name)+'"><h2>'+escapeHTML(d.name)+' <small>›</small></h2><p>'+ages[d.stage]+(d.stage<2&&growth(d)>=1?' · Пора расти':d.sleeping?' · Спит':' · '+families[d.species])+'</p><div class="mini-needs">'+needs.map(([key,label,icon])=>'<span title="'+label+'">'+glyph(icon)+Math.round(d.needs[key])+'</span>').join('')+'</div></button><div class="care-actions">'+actions.map(([key,icon,label])=>'<button class="act" data-care="'+key+'">'+glyph(icon)+label+'</button>').join('')+'</div>';
    }
  }
  function plural(n,forms){return forms[n%100>10&&n%100<20?2:n%10===1?0:n%10>=2&&n%10<=4?1:2];}
  function warm(){
    if(!activeEgg()||hatchBusy)return;
    const hatch=Grove.warm();
    if(!hatch){render();sound('egg');bounce();react(activeEgg().warmth===1?'✧':'✧ ✧');return;}
    hatchBusy=true;sound('hatch');render();splitShell();bounce();react('✦');
    setTimeout(()=>{hatchBusy=false;if(overlay.hidden)arrival(hatch);},970);
  }
  function arrival(d){
    modal('Вылупление');panel.innerHTML='<div class="sheet stack born-card">'+header(d.stage===2?'ОСОБОЕ ВЫЛУПЛЕНИЕ':'ПЕРВАЯ ВСТРЕЧА',d.stage===2?'Большой дракон!':'Дракоша вылупился!')+'<img class="pet-portrait" src="'+sprite(d.species,d.stage)+'" alt="'+families[d.species]+' дракон"><p>'+families[d.species]+' дракон осваивается в гнезде. Как его назвать?</p><form id="name-form" class="stack"><input class="field" id="pet-name" aria-label="Имя дракона" maxlength="20"><button class="gold">Домой, на древо</button></form></div>';
    bindName(d);
  }
  function bindName(d){
    $('pet-name').value=d.name;
    $('name-form').onsubmit=e=>{e.preventDefault();d.name=$('pet-name').value.trim().slice(0,20)||names[d.species];save();sound('pet');close();react('♥');};
  }
  function care(action){
    if(action==='warm'){warm();return;}
    const d=current();if(!d)return;
    if(action==='profile'){profile(d);return;}
    if(d.sleeping&&action!=='sleep'){toast('Дракон дремлет. Чтобы поиграть, разбудите его.');return;}
    if(action==='command'){treeCommand(d);return;}
    const change={pet:['fun',16,'pet','♥'],feed:['food',22,'feed','Ням!'],wash:['clean',24,'pet','Кап-кап!']};
    if(action==='sleep'){d.sleeping=!d.sleeping;save();render();sound(d.sleeping?'sleep':'pet');react(d.sleeping?'Zzz…':'Доброе утро!');return;}
    const item=change[action];if(!item)return;
    const [stat,amount,fx,words]=item,before=d.needs[stat];
    d.needs[stat]=Math.min(100,before+amount);if(before<96)d.xp+=2;
    save();render();sound(fx);bounce();react(words);
    flourish({feed:'berry',wash:'drop',pet:'heart'}[action],{feed:'#f9b4ae',wash:'#9feef3',pet:'#ffbecd'}[action]);
    if(d.stage===0 && (action==='pet'||action==='feed')){
      clearTimeout(expressionTimer);$('hero-img').src=sprite(d.species,d.stage,'happy');
      expressionTimer=setTimeout(()=>{if(current()?.id===d.id)$('hero-img').src=sprite(d.species,d.stage,d.sleeping?'sleep':'idle');},1550);
    }
  }
  $('dock').onclick=e=>{const b=e.target.closest('[data-care]');if(b)care(b.dataset.care);};
  let stroke=null,skipTap=false;
  hero.onpointerdown=e=>{skipTap=false;stroke={x:e.clientX,y:e.clientY,distance:0};hero.setPointerCapture(e.pointerId);};
  hero.onpointermove=e=>{
    if(!stroke||skipTap||!overlay.hidden||activeEgg())return;
    stroke.distance+=Math.hypot(e.clientX-stroke.x,e.clientY-stroke.y);stroke.x=e.clientX;stroke.y=e.clientY;
    if(stroke.distance>=36){skipTap=true;care('pet');}
  };
  hero.onpointercancel=hero.onpointerup=()=>{stroke=null;};
  hero.onclick=e=>{if(e.detail&&skipTap){skipTap=false;return;}if(activeEgg())warm();else care('pet');};
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
  function collection(){
    modal('Коллекция');panel.innerHTML='<div class="sheet stack">'+header('ЖИТЕЛИ ДРЕВА','Коллекция')+
      (s.dragons.length?'<div class="collection-grid">'+s.dragons.map(d=>'<button class="dragon-card '+(d.id===s.focus?'active':'')+'" data-id="'+d.id+'"><img src="'+sprite(d.species,d.stage)+'" alt=""><b>'+escapeHTML(d.name)+'</b><small>'+ages[d.stage]+'</small></button>').join('')+'</div>':'<p>Первый житель пока в скорлупе. Согрейте яйцо в гнезде.</p>')+
      (s.eggs.length?'<button class="soft" id="eggs">'+glyph('egg')+'К гнезду · '+s.eggs.length+'</button>':'')+
      '<hr><h3>Семейства ToysBerry</h3><div class="collection-grid">'+families.map((f,i)=>'<button class="dragon-card" data-family="'+i+'"><img src="'+sprite(i,2)+'" alt=""><b>'+f+'</b></button>').join('')+'</div>'+
      '<button class="soft" id="add-toy">'+glyph('qr')+'Добавить игрушку</button></div>';
    panel.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{s.focus=b.dataset.id;save();close();sound('pet');profile(current());});
    panel.querySelectorAll('[data-family]').forEach(b=>b.onclick=()=>family(Number(b.dataset.family)));
    if($('eggs'))$('eggs').onclick=()=>{s.focus='egg';save();close();};$('add-toy').onclick=()=>openMenu('qr');
  }
  function family(i){
    modal('Семейство');panel.innerHTML='<div class="sheet stack">'+header('СЕМЕЙСТВА TOYSBERRY',families[i]+' дракон')+
      '<div class="evo-line">'+ages.map((a,j)=>'<div class="evo-card"><img src="'+sprite(i,j)+'" alt=""><b>'+a+'</b></div>').join('')+'</div>'+
      (i<2?'<h3>Из игрушки в игру</h3><div class="toy-pair"><figure><img src="'+groveAsset('assets/dragons/toy-'+(i===0?'leaf':'ember')+'.webp')+'" alt="Фотография игрушки"><figcaption>Игрушка ToysBerry</figcaption></figure><figure><img src="'+sprite(i,2)+'" alt="Большой дракон из игры"><figcaption>Дракон на древе</figcaption></figure></div>':'')+
      '<button class="soft" id="back-collection">Вернуться в коллекцию</button></div>';$('back-collection').onclick=collection;
  }
  function shop(){
    modal('Лесная лавка');panel.innerHTML='<div class="sheet stack">'+header('УКРАШЕНИЯ ДРЕВА','Лесная лавка')+'<p>У вас '+s.coins+' пыльцы. Её приносят лесные игры.</p><div class="shop-grid">'+Grove.decor.map(({id,name,price})=>{
      const owned=s.owned.includes(id),equipped=s.equipped.includes(id);
      return '<div class="shop-card"><img src="'+groveAsset('assets/decor/'+id+'.webp')+'" alt=""><b>'+name+'</b><button class="'+(owned?'soft':'gold')+'" data-buy="'+id+'" '+(!owned&&price>s.coins?'disabled':'')+'>'+ (owned?(equipped?'Снять':'Разместить'):glyph('pollen')+' '+price)+'</button></div>';
    }).join('')+'</div><p>Украшения меняют вид вашего древа.</p></div>';
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
    cleanup=DragonActivities.open(kind,{root:panel,dragon:d,sprite:sprite(d.species,d.stage),sound,onClose:close,onReward:({coins=0,xp=0,trick,phrase})=>{
      if(trick&&Object.hasOwn(d.tricks,trick))return;
      if(trick)d.tricks[trick]=phrase;
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
  audioUI();render();
  setInterval(()=>{Grove.tick(document.hidden);save();if(overlay.hidden&&!hatchBusy&&!document.activeElement?.closest('#dock'))render();},15000);
  document.addEventListener('visibilitychange',()=>{Grove.tick(true);save();});
})();
