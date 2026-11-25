(() => {
  'use strict';
  const regions = [
    [.79,.692,.214,.082,2], [.87,.731,.125,.070,2],
    [.825,.42,.195,.091,3], [.171,.255,.182,.081,4],
    [.86,.256,.182,.094,5], [.50,.094,.244,.089,6], [.349,.33,.14,.061,6],
    [.27,.858,.17,.063,7], [.36,.82,.12,.051,7],
  ];
  const clearings = [[.489,.437,.194,.125],[.259,.605,.169,.106]];
  const clamp = v => Math.max(0,Math.min(1,v));
  function smooth(a,b,v){const t=clamp((v-a)/(b-a));return t*t*(3-2*t);}
  function distance(x,y,[cx,cy,rx,ry]){return Math.hypot((x-cx)/rx,(y-cy)/ry);}
  let count=1, fades=regions.map(()=>1), openedAt=regions.map(()=>-Infinity), initialized=false;
  let paint=()=>{}, frame;

  function blocked(x,y){
    const hole=clearings.reduce((a,spot)=>a*smooth(.77,1.23,distance(x,y,spot)),1);
    return regions.some((spot,i)=>hole*(1-smooth(.56,1.14,distance(x,y,spot)))*fades[i]>.44);
  }

  function setCount(next){
    if(initialized && next===count)return;
    if(initialized)regions.forEach((spot,i)=>{if(spot[4]>count && spot[4]<=next)openedAt[i]=performance.now();});
    initialized=true;
    count=next;
    start();
  }

  const host=document.querySelector('#shrouds');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=768;
  canvas.className='world-fog';host.append(canvas);
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false});
  const regionData=new Float32Array(regions.flatMap(spot=>spot.slice(0,4)));
  function webgl(){
    if(!gl)return false;
    const vertex=`attribute vec2 point;varying vec2 uv;
      void main(){uv=vec2(point.x*.5+.5,.5-point.y*.5);gl_Position=vec4(point,0.,1.);}`;
    const fragment=`precision mediump float;varying vec2 uv;
      uniform vec4 region[${regions.length}],clearings[2];
      uniform float density[${regions.length}],clock;
      float h(vec2 p){return fract(sin(dot(p,vec2(41.73,269.53)))*4198.75);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}
      float cloud(vec2 p){return .57*noise(p)+.27*noise(p*2.03)+.11*noise(p*4.17)+.05*noise(p*8.21);}
      float d(vec2 p,vec4 r){return length((p-r.xy)/r.zw);}
      void main(){
        vec2 p=uv*vec2(8.8,12.6);float wind=clock*.29;
        vec2 curls=vec2(cloud(p*.83+vec2(wind,0.)),cloud(p*.86+vec2(-wind,.9)));
        float billow=cloud(p+curls*2.25+vec2(-wind*.73,wind*.26));
        float ripple=cloud(p*1.92+vec2(wind*.52,-wind*.31));
        vec2 sway=(curls-.5)*vec2(.063,.055);
        float bank=0.;
        for(int i=0;i<${regions.length};i++){
          float g=1.-smoothstep(.45,1.19,d(uv+sway,region[i]));
          bank=max(bank,g*density[i]);
        }
        float hole=1.;
        for(int i=0;i<2;i++)hole*=smoothstep(.69,1.21,d(uv,clearings[i]));
        float folds=clamp(billow*.78+ripple*.22,0.,1.);
        float alpha=smoothstep(.06,.76,bank*(.42+.84*folds))*hole;
        float width=.064+.046*ripple;
        float edge=smoothstep(0.,width,uv.x)*smoothstep(0.,width,1.-uv.x)*
          smoothstep(0.,.17+.05*folds,uv.y)*smoothstep(0.,.17+.06*folds,1.-uv.y);
        float rim=exp(-pow((bank-.35)*5.,2.))*smoothstep(.33,.76,folds);
        vec3 color=mix(vec3(.11,.137,.245),vec3(.285,.258,.403),smoothstep(.27,.72,folds));
        color=mix(color,vec3(.51,.37,.48),rim*.72);
        gl_FragColor=vec4(color,alpha*edge*(.82+.105*folds));
      }`;
    const program=gl.createProgram();
    for(const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
      const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(shader));return false;}
      gl.attachShader(program,shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return false;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const point=gl.getAttribLocation(program,'point');
    gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
    gl.uniform4fv(gl.getUniformLocation(program,'region[0]'),regionData);
    gl.uniform4fv(gl.getUniformLocation(program,'clearings[0]'),new Float32Array(clearings.flat()));
    const time=gl.getUniformLocation(program,'clock'),density=gl.getUniformLocation(program,'density[0]');
    gl.viewport(0,0,canvas.width,canvas.height);
    const opacity=new Float32Array(regions.length);
    paint=t=>{opacity.set(fades);gl.uniform1f(time,t);gl.uniform1fv(density,opacity);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);};
    return true;
  }

  function fallback(){
    const replacement=canvas.cloneNode();canvas.replaceWith(replacement);
    const ctx=replacement.getContext('2d');
    function glow([x,y,rx,ry],inner,outer){
      const {width,height}=replacement;
      ctx.save();ctx.translate(x*width,y*height);ctx.scale(rx*width,ry*height);
      const g=ctx.createRadialGradient(0,0,.35,0,0,1.15);g.addColorStop(0,inner);g.addColorStop(1,outer);
      ctx.fillStyle=g;ctx.fillRect(-1.15,-1.15,2.3,2.3);ctx.restore();
    }
    paint=()=>{
      ctx.clearRect(0,0,replacement.width,replacement.height);
      regions.forEach((spot,i)=>glow(spot,`rgba(25,22,58,${fades[i]})`,'#18123200'));
      ctx.globalCompositeOperation='destination-out';
      clearings.forEach(spot=>glow(spot,'black','transparent'));
      ctx.globalCompositeOperation='source-over';
    };
    host.dataset.fog='canvas';
  }

  function draw(now){
    fades=regions.map((spot,i)=>spot[4]>count?1:reduced.matches?0:1-smooth(0,1650,now-openedAt[i]));
    paint(reduced.matches?0:now*.001);
  }
  let last=0;
  function tick(now){
    if(now-last>32){draw(now);last=now;}
    if(fades.some(opacity=>opacity>0))frame=requestAnimationFrame(tick);
  }
  function start(){
    cancelAnimationFrame(frame);
    if(document.hidden)return;
    draw(performance.now());
    if(!reduced.matches && fades.some(opacity=>opacity>0))frame=requestAnimationFrame(tick);
  }
  if(webgl())host.dataset.fog='shader';else fallback();
  canvas.addEventListener('webglcontextlost',()=>{fallback();draw(performance.now());},{once:true});
  document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);start();
  window.GroveFog={setCount,blocked};
})();
