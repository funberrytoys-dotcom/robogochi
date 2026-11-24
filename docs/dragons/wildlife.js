/* Local, lightweight wildlife. All coordinates are relative to the portrait stage. */
(() => {
  const canvas=document.querySelector('#grove-air'), ctx=canvas.getContext('2d');
  if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const art=Array.from({length:4},(_,index)=>{const image=new Image();image.src=groveAsset('assets/wildlife/'+index+'.webp');return image;});
  const TAU=Math.PI*2, flares=[];
  let w=1,h=1,last=0,clock=0,frame=0,call=null;
  const glow=document.createElement('canvas');glow.width=glow.height=36;
  const g=glow.getContext('2d'),gradient=g.createRadialGradient(18,18,0,18,18,18);
  gradient.addColorStop(0,'#fffcea');gradient.addColorStop(.12,'#fff7ae');gradient.addColorStop(.28,'#ffdc71c7');gradient.addColorStop(.65,'#ffe67144');gradient.addColorStop(1,'#ffdc6100');g.fillStyle=gradient;g.fillRect(0,0,36,36);
  const flight=[ [.19,.37,.14,.047,28], [.79,.55,.14,.08,24], [.33,.75,.15,.069,26], [.71,.27,.13,.042,19], [.43,.47,.26,.076,20], [.81,.72,.11,.05,17] ];
  function resize(){
    w=canvas.clientWidth;h=canvas.clientHeight;if(!w||!h)return;
    const ratio=Math.min(1.6,devicePixelRatio||1);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);paint();
  }
  function paint(){
    ctx.clearRect(0,0,w,h);const t=clock, obscured=GroveDepth.wildlifeMask(canvas);
    for(let i=0;i<28;i++){
      const f=i*2.39996, near=i%5===0;
      const x=w*(.08+.84*((i*.618)%1)+.061*Math.sin(t*.33+f)+.013*Math.sin(t*1.23-f));
      const y=h*(.20+.63*((i*.423+0.31)%1)+.03*Math.sin(t*.49-f));const size=near?14:8.5;
      ctx.globalAlpha=.30+.66*(.5+.5*Math.sin(t*(.9+i%3*.22)+f));ctx.drawImage(glow,x-size,y-size,size*2,size*2);
    }
    for(let i=0;i<14;i++){
      const u=(i*.138+t*(.014+i%3*.003))%1;
      const x=w*((i*.431+u*.21+.055*Math.sin(u*8+i)+1)%1),y=h*(.09+.82*u);
      if(obscured?.(x,y))continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(u*7+i);ctx.globalAlpha=.34+(i%3)*.11;ctx.fillStyle=['#fff2c2','#edb2ae','#c9e48d'][i%3];
      ctx.beginPath();ctx.ellipse(0,0,1.8+1.4*Math.abs(Math.cos(u*10+i)),1.5,0,0,TAU);ctx.fill();ctx.restore();
    }
    flight.forEach(([cx,cy,rx,ry,base],i)=>{
      const img=art[i%4];if(!img.naturalWidth)return;const phase=t*(.38+i*.041)+i*2.07;
      let x=w*(cx+Math.sin(phase)*rx), y=h*(cy+Math.sin(phase*1.6+.4)*ry)+Math.sin(t*3+i)*2;
      const visit=call?Math.max(0,1-(clock-call.time)/3.2):0;
      if(visit&&i<3){const blend=Math.sin(visit*Math.PI)*.88;x+=(call.x+Math.sin(phase*3)*36-x)*blend;y+=(call.y-17+Math.cos(phase*3)*20-y)*blend;}
      if(obscured?.(x,y) || obscured?.(x-8,y) || obscured?.(x+8,y))return;
      const size=base*Math.min(1.4,Math.max(.82,w/400)), width=size*(.23+.77*Math.abs(Math.sin(t*(5.6+i*.42)+i*.7)));
      ctx.save();ctx.translate(x,y);ctx.rotate(.22*Math.sin(phase*1.8)+.65*Math.cos(phase));ctx.globalAlpha=i<4?.97:.78;ctx.drawImage(img,-width/2,-size*.39,width,size*.78);ctx.restore();
    });
    for(let i=flares.length-1;i>=0;i--){
      const f=flares[i],u=(clock-f.t)/1.8;if(u>=1){flares.splice(i,1);continue;}
      const x=f.x+Math.cos(f.angle)*f.range*u, y=f.y+Math.sin(f.angle)*f.range*u-32*u*u;
      ctx.globalAlpha=1-u;ctx.drawImage(glow,x-9,y-9,18,18);
    }
    ctx.globalAlpha=1;
  }
  function step(now){
    frame=0;if(document.hidden||reduced.matches)return;
    if(now-last>=32){clock+=Math.min((now-last)/1000,.08);last=now;if(document.querySelector('#overlay').hidden)paint();}
    frame=requestAnimationFrame(step);
  }
  function restart(){cancelAnimationFrame(frame);frame=0;last=performance.now();if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(step);else paint();}
  function stir(el){
    if(reduced.matches)return;const box=el.getBoundingClientRect(), stage=canvas.getBoundingClientRect();
    const x=box.left+box.width*.5-stage.left,y=box.top+box.height*.36-stage.top;call={x,y,time:clock};
    if(flares.length>30)flares.splice(0,12);
    for(let i=0;i<12;i++)flares.push({x,y,t:clock,angle:i*TAU/12+.2,range:25+(i%5)*8});
  }
  new ResizeObserver(resize).observe(canvas);art.forEach(image=>image.onload=paint);
  document.addEventListener('visibilitychange',restart);reduced.addEventListener('change',restart);restart();
  window.GroveAir={stir};
})();
