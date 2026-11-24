(() => {
  const heart=document.getElementById('tree-heart'),veins=document.getElementById('heart-veins');
  const tree=document.getElementById('game');
  const ns='http://www.w3.org/2000/svg';
  // Each path follows a separate curl of bark. Only the short highlights travel.
  const grain=[
    'M211 340 C200 317 201 301 215 278 S254 231 259 202 Q262 179 278 157',
    'M207 322 C189 306 179 287 180 273 Q184 253 199 235',
    'M214 337 C232 315 235 296 244 284 Q258 269 262 252',
    'M209 345 C205 371 182 389 178 409 S173 442 142 460 Q122 473 120 482',
    'M210 350 C213 379 229 398 233 419 S218 462 231 480 Q244 500 238 520',
    'M200 378 Q184 385 177 399 T147 423',
    'M222 398 Q242 408 245 423 T255 449'
  ];
  grain.forEach((d,i)=>{
    const line=document.createElementNS(ns,'path');line.setAttribute('class','sap');
    line.setAttribute('d',d);line.setAttribute('pathLength','112');line.setAttribute('stroke',i%3===1?'#bcdac1':'#f59d67');
    line.setAttribute('stroke-width',i<5?'1.3':'.8');line.setAttribute('opacity',i<5?'.57':'.42');
    const highlight=line.cloneNode();highlight.setAttribute('class','sap sap-lit');highlight.style.animationDelay=(-i*.84)+'s';
    veins.append(line,highlight);
  });
  for(let i=0;i<10;i++){
    const spark=document.createElement('i');spark.className='heart-ember';spark.setAttribute('aria-hidden','true');
    spark.style.cssText='--dx:'+Math.round(Math.sin(i*4.7)*18)+'px;--dy:'+(-25-(i%4)*13)+'px;--life:'+(2.5+i*.21)+'s;--delay:'+(-i*.76)+'s';
    heart.append(spark);
  }
  let timeout;
  heart.addEventListener('click',()=>{
    tree.classList.remove('heart-awake');void heart.offsetWidth;tree.classList.add('heart-awake');
    window.GroveAir?.stir(heart);window.DragonAudio?.play('note0');
    clearTimeout(timeout);timeout=setTimeout(()=>tree.classList.remove('heart-awake'),1800);
  });
})();
