(() => {
  'use strict';
  // Coordinates follow the individual streams in assets/depth/valley.webp.
  const falls=[
    {top:.317,bottom:.391,streams:[[.715,.699,.007],[.727,.710,.008],[.741,.725,.006]],mist:[.714,.394,.062]},
    {top:.330,bottom:.378,streams:[[.779,.770,.008]]},
    {top:.455,bottom:.509,streams:[[.638,.627,.007],[.650,.646,.006],[.656,.654,.003]],mist:[.643,.513,.047]},
    {top:.532,bottom:.595,streams:[[.679,.657,.009],[.693,.674,.012],[.709,.693,.010]],mist:[.678,.599,.063]}
  ];
  const fraction=value=>value-Math.floor(value);
  const mix=(a,b,s)=>a+(b-a)*s;
  const ease=s=>s*s*(3-2*s);
  const profiles={
    glider:{body:'#305078',wing:'#6b90ac',light:'#a6c3d6',tail:20},
    swift:{body:'#594d79',wing:'#a78eaf',light:'#dcc4c4',tail:14},
    river:{body:'#2e6880',wing:'#79a8ad',light:'#b9d7c9',tail:26}
  };
  const routes=[
    {kind:'glider',cycle:14,delay:2.5,size:.067,points:[[1.07,.324,0],[.89,.335,0],[.737,.358,0],[.690,.370,0],[.53,.426,0],[.32,.446,0],[.10,.403,0],[-.09,.367,0]]},
    {kind:'swift',cycle:22,delay:9,size:.058,points:[[1.10,.474,0],[.927,.529,0],[.87,.570,0],[.830,.605,1],[.830,.605,1],[.830,.605,1],[.785,.593,0],[.677,.605,0],[.45,.648,0],[.27,.676,0],[-.08,.640,0]]},
    {kind:'river',cycle:19,delay:4.2,size:.050,points:[[-.12,.588,0],[.135,.566,0],[.31,.624,0],[.51,.662,0],[.686,.618,0],[.756,.559,0],[.95,.531,0],[1.12,.48,0]]},
    {kind:'glider',cycle:18,delay:5,size:.026,points:[[-.10,.196,0],[.22,.223,0],[.493,.225,0],[.73,.178,0],[1.10,.204,0]]},
    {kind:'swift',cycle:18,delay:4,size:.021,points:[[-.10,.210,0],[.22,.235,0],[.49,.245,0],[.74,.199,0],[1.10,.219,0]]}
  ];

  function pathAt(points,p){
    const k=Math.min(points.length-2,Math.floor(p));
    const s=p-k;
    return [0,1].map(axis=>{
      const a=points[Math.max(k-1,0)][axis],b=points[k][axis];
      const c=points[k+1][axis],d=points[Math.min(k+2,points.length-1)][axis];
      if(b===c)return b;
      const start=a===b?0:(c-a)*.42;
      const end=c===d?0:(d-b)*.42;
      return mix(b,c,ease(s))+s*(1-s)*(start*(1-s)-end*s);
    });
  }

  function silhouette(ctx,profile,time,perched,distant=false){
    const palette=profiles[profile];
    const body=distant?'#393754':palette.body;
    const wing=distant?'#57526b':palette.wing;
    const light=distant?wing:palette.light;
    const {tail}=palette;
    const rhythm=time*(profile==='swift'?12:8);
    ctx.lineCap='round';
    ctx.lineJoin='round';
    if(profile==='river'){
      ctx.strokeStyle=body;
      for(let i=0;i<20;i++){
        const x=-tail+i*1.75;
        const y=Math.sin(rhythm-x*.28)*(3.4-i*.095);
        ctx.lineWidth=1.1+i*.23;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1.75,Math.sin(rhythm-(x+1.75)*.28)*(3.3-i*.095));ctx.stroke();
      }
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(9,-1,5,3,.08,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=light;ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(7,-3);ctx.lineTo(4,-7);ctx.lineTo(2,-8);
      ctx.moveTo(12,0);ctx.quadraticCurveTo(17,1,16,5);ctx.stroke();
      return;
    }
    const lift=Math.sin(rhythm);
    function membrane(far){
      const extension=mix(far?-8:lift*14,4,perched);
      const reach=mix(far?-8:-4,profile==='swift'?-11:-13,perched);
      ctx.fillStyle=far?body:wing;
      ctx.beginPath();ctx.moveTo(1,1);
      ctx.quadraticCurveTo(1,-3,reach,extension-6);
      ctx.quadraticCurveTo(reach-7,extension-5,reach-12,extension-2);
      ctx.quadraticCurveTo(reach-5,extension+1,reach-4,extension+4);
      ctx.quadraticCurveTo(reach,extension+2,reach+3,extension+7);
      ctx.quadraticCurveTo(reach+5,extension+3,-2,3);ctx.closePath();ctx.fill();
    }
    membrane(true);
    ctx.strokeStyle=body;ctx.lineWidth=2.7;
    ctx.beginPath();ctx.moveTo(-3,2);ctx.quadraticCurveTo(-tail*.55,5,-tail,3+3*Math.sin(rhythm*.56));ctx.stroke();
    ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(1,1,9,3.9,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(4,2);ctx.quadraticCurveTo(7,-5,9,-5);
    ctx.lineTo(8,-8);ctx.lineTo(12,-5);ctx.quadraticCurveTo(19,-3,14,-1);ctx.lineTo(9,2);ctx.closePath();ctx.fill();
    membrane(false);
    ctx.strokeStyle=body;ctx.lineWidth=1.65;
    for(const foot of [-3,4]){
      ctx.beginPath();ctx.moveTo(foot,2);ctx.lineTo(foot+mix(-2,0,perched),mix(4,7,perched));
      ctx.lineTo(foot+mix(-.2,3,perched),mix(4,7,perched));ctx.stroke();
    }
  }

  function fly(ctx,time,width,height,scale){
    for(const route of routes){
      const {points,cycle,delay,kind,size}=route;
      const slot=fraction((time+delay)/cycle)*(points.length-1);
      const [x,y]=pathAt(points,slot);
      const segment=Math.min(points.length-2,Math.floor(slot));
      const perched=mix(points[segment][2],points[segment+1][2],ease(slot-segment));
      const [ax,ay]=pathAt(points,Math.max(0,slot-.025));
      const [bx,by]=pathAt(points,Math.min(points.length-1,slot+.025));
      const left=points[0][0]>points.at(-1)[0];
      const span=width*size*scale/36;
      ctx.save();
      ctx.translate(x*width,y*height+Math.sin(time*3.7)*span*(1-perched));
      if(left)ctx.scale(-1,1);
      const pitch=Math.atan2((by-ay)*height,Math.max((left?ax-bx:bx-ax)*width,.15));
      ctx.rotate(Math.max(-.44,Math.min(.44,pitch))*(1-perched));
      ctx.scale(span,span);
      ctx.globalAlpha=size<.03?.56:.91;
      silhouette(ctx,kind,time+delay,perched);
      ctx.restore();
    }
  }

  function draw(ctx,time,x,y,width,height,dragonScale=1){
    ctx.save();
    ctx.translate(x,y);
    fly(ctx,time,width,height,dragonScale);
    ctx.scale(width,height);
    falls.forEach(({top,bottom,streams,mist},index)=>{
      for(const [start,end,breadth] of streams){
        const drop=bottom-top;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(start-breadth*.32,top);
        ctx.bezierCurveTo(start-breadth,top+drop*.30,end-breadth*.60,bottom-drop*.24,end-breadth*.50,bottom);
        ctx.lineTo(end+breadth*.64,bottom);
        ctx.bezierCurveTo(end+breadth*.56,bottom-drop*.34,start+breadth*.45,top+drop*.21,start+breadth*.50,top);
        ctx.clip();
        for(let i=0;i<8;i++){
          const progress=fraction(time*(.53+.075*(i%3))+i*.618+start*31);
          const y0=top+drop*progress;
          const span=drop*(.10+.07*(i%3));
          const ripple=ctx.createLinearGradient(0,y0,0,y0+span);
          const fade=Math.sin(Math.PI*progress)*(.18+.065*(i%3));
          ripple.addColorStop(0,'rgba(180,224,255,0)');
          ripple.addColorStop(.40,`rgba(195,233,255,${fade})`);
          ripple.addColorStop(1,'rgba(180,224,255,0)');
          ctx.fillStyle=ripple;
          const lane=(fraction(i*.381+start*4)-.5)*breadth*.7;
          const x0=end+(start-end)*(1-progress)+lane;
          ctx.fillRect(x0-breadth*.27,y0,breadth*.55,span);
        }
        ctx.restore();
      }
      if(!mist)return;
      const [mx,my,spread]=mist;
      for(let i=0;i<3;i++){
        const p=fraction(time*.17+i/3+index*.179);
        ctx.save();
        ctx.translate(mx-spread*(p-.17)*.46,my+p*.006);
        ctx.scale(spread*(.33+.38*p),.006+.004*p);
        const fog=ctx.createRadialGradient(0,0,0,0,0,1);
        fog.addColorStop(0,`rgba(178,224,248,${.21*Math.sin(Math.PI*p)})`);
        fog.addColorStop(1,'rgba(173,225,255,0)');
        ctx.fillStyle=fog;
        ctx.fillRect(-1,-1,2,2);
        ctx.restore();
      }
    });
    ctx.restore();
  }

  function drawResident(ctx,time,width,height){
    const age=(time+.8)%15;
    if(age>11)return;
    const arrival=ease(Math.min(1,age/3.1));
    const departure=ease(Math.max(0,Math.min(1,(age-7.8)/3.2)));
    const landed=ease(Math.max(0,Math.min(1,(age-2.55)/.55)))*(1-departure);
    ctx.save();
    ctx.translate(width*(mix(-.10,.45,arrival)+.68*departure),
                  height*(mix(.07,.49,arrival)-.35*departure+Math.sin(time*3.4)*.035*(1-landed)));
    ctx.scale(width/238,width/238);
    silhouette(ctx,'swift',time,landed);
    ctx.restore();
  }

  const distant = [
    {kind:'glider', cycle:49, offset:.15, y:.25, size:15, alpha:.76},
    {kind:'swift', cycle:48, offset:.12, y:.28, size:12, alpha:.68},
    {kind:'river', cycle:42, offset:.26, y:.55, size:21, alpha:.68},
    {kind:'glider', cycle:31, offset:.10, y:.54, size:15, alpha:.59},
  ];
  function drawDistant(ctx,time,width,height){
    distant.forEach(({kind,cycle,offset,y,size,alpha},index)=>{
      const p=fraction(time/cycle+offset);
      const left=index>1;
      const x=mix(-.08,1.08,left?1-p:p);
      const wingTime=time*.63+index*.30;
      const rise=Math.sin(p*2*Math.PI+index*.47)*.052;
      ctx.save();
      ctx.translate(width*x,height*(y+rise));
      ctx.rotate(.15*Math.cos(p*2*Math.PI+index*.47)*(left?-1:1));
      ctx.scale(size/38*(left?-1:1),size/38);
      ctx.globalAlpha=alpha;
      silhouette(ctx,kind,wingTime,0,true);
      ctx.restore();
    });
  }

  window.GroveWaterfalls={draw,drawResident,drawDistant,streams:falls.flatMap(({top,bottom,streams})=>
    streams.map(([start,end,width])=>({top,bottom,start,end,width})))};
  const plane=document.querySelector('.depth-plane.far');
  if(!plane)return;
  const canvas=document.createElement('canvas');
  canvas.className='valley-waterfalls';
  canvas.setAttribute('aria-hidden','true');
  plane.append(canvas);
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=-Infinity;
  function render(now){
    if(!plane.classList.contains('valley-active')&&now-last>=30){
      last=now;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      draw(ctx,now/1000,0,0,canvas.width,canvas.height);
    }
    frame=requestAnimationFrame(render);
  }
  function resume(){
    cancelAnimationFrame(frame);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!document.hidden&&!reduce.matches)frame=requestAnimationFrame(render);
  }
  new ResizeObserver(()=>{
    const scale=Math.min(1,600/canvas.clientWidth,1000/canvas.clientHeight);
    canvas.width=Math.max(1,Math.round(canvas.clientWidth*scale));
    canvas.height=Math.max(1,Math.round(canvas.clientHeight*scale));
    last=-Infinity;
  }).observe(canvas);
  document.addEventListener('visibilitychange',resume);
  reduce.addEventListener('change',resume);
  resume();
})();
