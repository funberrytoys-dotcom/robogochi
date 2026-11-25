(() => {
  'use strict';
  const hero=document.querySelector('#hero'),art=document.querySelector('#hero-img');
  const game=document.querySelector('#game'),panel=document.querySelector('#overlay');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas'),held=document.createElement('span');
  canvas.className='resident-skin';canvas.setAttribute('aria-hidden','true');
  held.className='resident-suspension';held.hidden=true;game.append(held);
  const css=document.createElement('style');
  css.textContent=`
    .resident-skin{display:block;position:absolute;left:-38%;top:-75%;width:176%;height:250%;pointer-events:none}
    .resident-skin[hidden],.resident-suspension[hidden]{display:none}
    #hero[data-resident-skin] #hero-img,.dragon-stage-lift[data-resident-skin]{visibility:hidden}
    #hero.dragon-lifted .resident-skin,#hero.flight-over .resident-skin{visibility:hidden}
    .resident-suspension{position:absolute;z-index:10;pointer-events:none}
    .resident-suspension[hidden]{display:none}
  `;
  document.head.append(css);

  // Coordinates follow the six approved illustrations. Families 1–5 share poses;
  // the leaf dragon has its own silhouettes and anchors at every age.
  const leaf=[
    {neck:[.29,.55], chest:[.43,.68], hip:[.59,.71], scruff:[.31,.45], wrist:[.47,.56],
     fore:[.29,.74],hind:[.60,.74],wing:[.62,.42,.20,.24],tail:[[.57,.73],[.75,.69],[.86,.55],[.94,.32]]},
    {neck:[.25,.48], chest:[.43,.60], hip:[.61,.64], scruff:[.31,.44], wrist:[.44,.52],
     fore:[.27,.62],hind:[.58,.69],wing:[.57,.28,.25,.29],tail:[[.59,.65],[.76,.67],[.92,.49],[.91,.14]]},
    {neck:[.33,.40], chest:[.41,.60], hip:[.55,.64], scruff:[.37,.48], wrist:[.50,.47],
     fore:[.30,.67],hind:[.53,.65],wing:[.72,.26,.36,.32],tail:[[.54,.60],[.76,.66],[.88,.79],[.78,.93],[.60,.91]]}
  ];
  const brood=[
    {neck:[.34,.53], chest:[.46,.65], hip:[.61,.70], scruff:[.38,.46], wrist:[.45,.56],
     fore:[.38,.70],hind:[.62,.74],wing:[.63,.51,.17,.18],tail:[[.61,.72],[.77,.85],[.91,.84],[.94,.73]]},
    {neck:[.27,.45], chest:[.42,.59], hip:[.59,.66], scruff:[.33,.43], wrist:[.43,.50],
     fore:[.30,.67],hind:[.57,.69],wing:[.62,.52,.21,.23],tail:[[.60,.66],[.77,.85],[.89,.89],[.94,.79]]},
    {neck:[.24,.43], chest:[.35,.64], hip:[.55,.77], scruff:[.30,.45], wrist:[.38,.49],
     fore:[.24,.67],hind:[.47,.76],wing:[.53,.66,.22,.24],tail:[[.54,.79],[.68,.88],[.82,.88],[.91,.73]]}
  ];
  const ns=['baby','teen','adult'];
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  function smooth(a,b,v){const t=clamp((v-a)/(b-a));return t*t*(3-2*t);}
  function distance(x,y,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1],k=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy));
    return Math.hypot(x-a[0]-k*dx,y-a[1]-k*dy);
  }
  function buildGrid(s){
    const columns=42,rows=34,vertices=[],indices=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
      const x=i/columns,y=j/rows;
      const head=(1-smooth(s.neck[0]-.063,s.neck[0]+.12,x))*(1-smooth(s.neck[1]-.02,s.neck[1]+.14,y));
      const leg=(a,width)=>(1-smooth(width*.54,width,Math.abs(x-a[0])))*smooth(a[1]-.028,a[1]+.135,y);
      const fore=leg(s.fore,.175),hind=leg(s.hind,.19);
      let d=1;
      for(let k=1;k<s.tail.length;k++)d=Math.min(d,distance(x,y,s.tail[k-1],s.tail[k]));
      const rootDistance=Math.hypot(x-s.hip[0],y-s.hip[1]);
      const distal=smooth(.77,.89,x)*smooth(.09,.32,s===leaf[2]?y-.43:y);
      const tail=Math.max(distal,(1-smooth(.105,.24,d))*smooth(.035,.17,rootDistance)*smooth(s.hip[0]-.03,s.hip[0]+.07,x));
      const [wx,wy,rx,ry]=s.wing;
      const wing=(1-smooth(.48,1.17,Math.hypot((x-wx)/rx,(y-wy)/ry)))*(1-.9*head)*(1-tail*.95);
      const chest=(1-smooth(.05,.52,Math.hypot((x-s.chest[0])*.95,(y-s.chest[1])*1.08)))*(1-smooth(.70,.98,y));
      vertices.push(x,y,head,chest,wing,tail,fore,hind);
      if(i<columns&&j<rows){const a=j*(columns+1)+i,b=a+1,c=a+columns+1;indices.push(a,b,c,b,c+1,c);}
    }
    return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
  }
  function renderer(){
    const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,depth:false,stencil:false});
    if(!gl)return;
    const vs=`
      attribute vec2 rest,legs;
      attribute vec4 weights;
      uniform vec2 neck,chest,hip,wrist,fore,hind,scruff;
      uniform float ratio,clock,reach,hang,swing,affection,temper,asleep;
      varying vec2 uv;
      vec2 turn(vec2 p,vec2 pivot,float angle){
        vec2 q=(p-pivot)*vec2(1.,ratio);
        float c=cos(angle),s=sin(angle);
        return pivot+vec2(c*q.x-s*q.y,(s*q.x+c*q.y)/ratio);
      }
      void main(){
        uv=rest;
        vec2 p=rest;
        float breathing=sin(clock*2.38)*(1.-asleep*.42);
        float calm=1.-.72*hang;
        float head=weights.x, tr=weights.y, wing=weights.z, tail=weights.w;
        p.y-=tr*.016*(.5+.5*breathing);
        p.x+=tr*.006*breathing;
        p=turn(p,wrist,wing*(.085*sin(clock*1.67+.7)*calm-.24*hang+.095*reach));
        float tailWave=.19*sin(clock*1.84-3.9*(rest.x-hip.x));
        p=turn(p,hip,tail*(tailWave*calm+.46*hang+.10*reach));
        p.y+=tail*hang*.024;
        p=turn(p,fore,legs.x*(-.38*hang+.035*affection));
        p=turn(p,hind,-legs.y*.48*hang);
        p+=vec2(.018,.019)*legs.x*hang+vec2(-.024,-.039)*legs.y*hang;
        float gaze=.048*sin(clock*1.24+.5)*calm;
        p=turn(p,neck,head*(gaze-.32*reach+.12*affection-.43*hang+.11*temper));
        p+=head*vec2(-.076*reach-.04*temper,.044*reach-.025*affection+.011*breathing*calm);
        p=turn(p,scruff,hang*(.72+.12*swing));
        p.y+=.032*hang*tr;
        gl_Position=vec4((p.x+.38)/1.76*2.-1.,1.-(p.y+.75)/2.5*2.,0.,1.);
      }`;
    const fs=`precision mediump float;varying vec2 uv;uniform sampler2D skin;void main(){gl_FragColor=texture2D(skin,uv);}`;
    const pg=gl.createProgram();
    for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
      const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))return;
      gl.attachShader(pg,sh);
    }
    gl.linkProgram(pg);if(!gl.getProgramParameter(pg,gl.LINK_STATUS))return;
    gl.useProgram(pg);
    const vb=gl.createBuffer(),ib=gl.createBuffer();let count=0;
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    for(const [name,size,offset] of [['rest',2,0],['weights',4,8],['legs',2,24]]){
      const loc=gl.getAttribLocation(pg,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);
    }
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const u=Object.fromEntries(['neck','chest','hip','wrist','fore','hind','scruff','ratio','clock','reach','hang','swing','affection','temper','asleep'].map(k=>[k,gl.getUniformLocation(pg,k)]));
    return {load(image,s){
      const mesh=buildGrid(s);count=mesh.indices.length;
      gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      for(const k of ['neck','chest','hip','wrist','fore','hind','scruff'])gl.uniform2fv(u[k],s[k]);
      gl.uniform1f(u.ratio,image.naturalHeight/image.naturalWidth);
    },paint(width,height,values){
      const density=Math.min(devicePixelRatio||1,2.5);
      const w=Math.max(2,Math.min(1024,Math.round(width*1.76*density))), h=Math.max(2,Math.min(1024,Math.round(height*2.5*density)));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      for(const [key,value] of Object.entries(values))gl.uniform1f(u[key],value);
      gl.clear(gl.COLOR_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_SHORT,0);
    }};
  }
  let gpu,failed=false,src='',picture,rig,ready=false,frame=0,last=0,clock=0,feeding=-Infinity,suspension=0;
  function hide(){
    hero.removeAttribute('data-resident-skin');
    document.querySelector('.dragon-stage-lift')?.removeAttribute('data-resident-skin');
    held.hidden=true;canvas.hidden=true;
  }
  function setArt(d){
    const isLeaf=d.species===0;
    const name=isLeaf?'listik-'+ns[d.stage]:(d.sleeping?'sleep-':'still-')+ns[d.stage]+'-'+d.species;
    const url=groveAsset('assets/characters-v2/'+name+'.webp');
    if(src===url)return;
    src=url;ready=false;hide();
    const pending=new Image();
    pending.onload=()=>{
      if(src!==url||failed)return;
      rig=(isLeaf?leaf:brood)[d.stage];picture=pending;
      try{gpu.load(picture,rig);ready=true;wake();}catch{failed=true;hide();}
    };
    pending.src=url;
  }
  function sleep(){cancelAnimationFrame(frame);frame=0;last=0;hide();}
  function wake(){
    if(!frame && !failed && !document.hidden && panel.hidden)frame=requestAnimationFrame(tick);
  }
  function tick(now){
    frame=0;
    const state=window.DragonStage?.motionState();
    const d=state?.dragon;
    if(document.hidden||!panel.hidden||!d||hero.classList.contains('egg')){sleep();return;}
    const lifted=state.lifted,isHeld=Boolean(state.grip||state.landing);
    if(reduced.matches&&!isHeld || hero.matches('.flight-over,.trick-hop,.trick-spin,.trick-glow')){sleep();return;}
    if(!gpu&&!failed){gpu=renderer();if(!gpu)failed=true;}
    if(failed){hide();return;}
    setArt(d);if(!ready)return;
    if(now-last<30){wake();return;}
    const dt=last?Math.min(.10,(now-last)/1000):.033;last=now;
    clock+=reduced.matches?0:dt*(d.sleeping?.58:1);
    const arrival=state.landing?smooth(0,460,now-state.landing.at):0;
    const target=state.grip?1:state.landing?1-arrival:0;
    suspension=reduced.matches?target:suspension+(target-suspension)*(1-Math.exp(-dt*(target>suspension?9:16)));
    if(!isHeld)suspension=0;
    let width,height;
    if(isHeld){
      if(canvas.parentNode!==held)held.append(canvas);
      width=parseFloat(lifted.style.width)||182;height=width*picture.naturalHeight/picture.naturalWidth;
      const ax=rig.scruff[0]*(1-arrival)+.50*arrival,ay=rig.scruff[1]*(1-arrival)+.37*arrival;
      held.style.left=(parseFloat(lifted.style.left)-width*ax)+'px';
      held.style.top=(parseFloat(lifted.style.top)-height*ay)+'px';
      held.style.width=width+'px';held.style.height=height+'px';
      held.hidden=false;lifted.setAttribute('data-resident-skin','');
    }else{
      if(canvas.parentNode!==hero)hero.append(canvas);
      held.hidden=true;lifted.removeAttribute('data-resident-skin');
      width=art.clientWidth;height=art.clientHeight;
    }
    if(!width||!height){hide();wake();return;}
    const r=state.reaction, age=r?(now-r.at)/r.duration:1;
    const amount=smooth(0,.13,age)*(1-smooth(.7,1,age));
    const feedAge=(now-feeding)/1000;
    const reach=feedAge>=0&&feedAge<1.16?smooth(0,.27,feedAge)*(1-smooth(.74,1.16,feedAge))*(.87+.13*Math.cos((feedAge-.30)*21)):0;
    const affection=r&&['cuddle','purr'].includes(r.pose)?amount:0;
    const temper=r&&['angry','growl','bite'].includes(r.pose)?amount*(r.pose==='bite'?1:.34):0;
    gpu.paint(width,height,{clock,reach,hang:suspension,swing:state.grip?.swing||0,affection,temper,asleep:d.sleeping?1:0});
    canvas.hidden=false;hero.setAttribute('data-resident-skin','');wake();
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;sleep();});
  canvas.addEventListener('webglcontextrestored',()=>{gpu=undefined;failed=false;src='';ready=false;wake();});
  const observer=new MutationObserver(wake);
  observer.observe(hero,{attributes:true,attributeFilter:['class']});
  observer.observe(art,{attributes:true,attributeFilter:['src']});
  observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
  observer.observe(game,{attributes:true,attributeFilter:['data-dragon-grip']});
  reduced.addEventListener('change',()=>{sleep();wake();});
  document.addEventListener('visibilitychange',()=>{sleep();wake();});
  window.ResidentMotion={feed(){feeding=performance.now();wake();}};
  wake();
})();
