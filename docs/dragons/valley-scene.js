(() => {
  'use strict';
  const vertex=`
    attribute vec2 corner;
    uniform vec4 card;
    uniform vec3 view;
    uniform float depth;
    varying vec2 uv;
    void main(){
      uv=vec2(corner.x,1.-corner.y);
      vec2 world=card.xy+(corner-.5)*card.zw;
      float distance=depth+view.z;
      gl_Position=vec4((world-view.xy),0.,distance);
    }
  `;
  const fragment=`
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D picture, waveMap, swellMap;
    uniform vec4 region, flowPath;
    uniform float clock, phase, rain, layer, haze, aspect, opacity, fire, skyRise;
    float hash(vec2 p){
      p=fract(p*vec2(.1031,.11369));
      p+=dot(p,p.yx+19.19);
      return fract((p.x+p.y)*p.x);
    }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
    }
    // Biplanes sky-glsl.ts uses one star per cell and a density cutoff that
    // rises with nightfall. Here the same math uses an inline hash.
    float stars(vec2 p,float night){
      vec2 field=p*vec2(aspect*78.,78.);
      vec2 cell=floor(field);
      float zenith=max(.035,(cell.y+.5)/43.);
      float density=min(.82,night*.18*pow(zenith,-.412));
      float seed=hash(cell);
      float kindle=clamp((density-seed)/.04,0.,1.);
      vec2 dotAt=vec2(.23+hash(cell+4.)*.54,.23+hash(cell+8.)*.54);
      float distanceToStar=length(fract(field)-dotAt);
      float pulse=.72+.28*sin(clock*1.5+seed*42.);
      return (1.-smoothstep(.035,.105,distanceToStar))*kindle*pulse*.82*(1.-smoothstep(.22,.44,p.y));
    }
    // Long wind-sheared banks. Gaps in each band keep a dark sky between them.
    float cloudVeil(vec2 p,float seed,float speed){
      float wind=clock*speed;
      float bend=noise(vec2(p.x*2.2+wind,seed));
      float line=.22+.027*sin(p.x*5.+seed)+bend*.10;
      float mist=noise(vec2(p.x*6.+wind,p.y*23.+seed));
      float fiber=noise(vec2(p.x*12.+wind*.9,p.y*67.+seed));
      float edge=abs(p.y-line+.019*(mist-.5));
      return (1.-smoothstep(.005,.041+.03*mist,edge))*smoothstep(.29,.74,.64*bend+.36*fiber);
    }
    vec3 driftingSky(vec3 base,vec2 p,float night){
      float high=cloudVeil(p+vec2(.07,.088),2.8,.009);
      float low=cloudVeil(p-vec2(.19,.062),8.1,.018);
      vec3 pearl=mix(vec3(.88,.66,.75),vec3(.25,.46,.72),night);
      vec3 lilac=mix(vec3(.65,.54,.69),vec3(.32,.33,.61),night);
      return mix(mix(base,pearl,high*.50),lilac,low*.56);
    }
    vec3 biplanesSunset(vec2 p){
      // The three stops are the sunset preset from Biplanes sky-background.ts.
      vec3 top=vec3(43.,13.,54.)/255.;
      vec3 mid=vec3(124.,31.,78.)/255.;
      vec3 low=vec3(224.,86.,36.)/255.;
      vec3 c=mix(top,mid,smoothstep(-.13,.40,p.y));
      c=mix(c,low,smoothstep(.24,.64,p.y));
      c=mix(c,vec3(1.,.71,.42),smoothstep(.53,.80,p.y)*.73);
      vec2 moon=(p-vec2(.27,.338))*vec2(aspect,1.);
      float radius=length(moon);
      c+=vec3(.29,.12,.07)*exp(-radius*8.);
      float disc=1.-smoothstep(.0315,.033,radius);
      float maria=smoothstep(.25,.69,noise(moon*124.+5.))*.14;
      c=mix(c,vec3(1.,.918,.745)*(1.-maria),disc);
      return c;
    }
    void main(){
      float night=smoothstep(.52,1.,phase);
      float dusk=1.-abs(phase*2.-1.);
      if(layer<.5){
        if(fire>.5){
          vec2 p=vec2(uv.x,(uv.y-.20)*1.64+skyRise);
          gl_FragColor=vec4(driftingSky(biplanesSunset(p),p,.34),1.);
          return;
        }
        vec3 top=mix(vec3(.26,.51,.69),vec3(.31,.21,.44),dusk);
        vec3 horizon=mix(vec3(.80,.92,.88),vec3(.99,.66,.43),dusk);
        top=mix(top,vec3(.025,.06,.15),night);
        horizon=mix(horizon,vec3(.18,.38,.48),night);
        vec3 c=mix(top,horizon,smoothstep(0.,.54,uv.y));
        c=mix(c,vec3(.21,.29,.41),rain*.45);
        vec2 moon=(uv-vec2(.70,.160))*vec2(aspect,1.);
        float m=length(moon);
        float disk=(1.-smoothstep(.014,.015,m))*night;
        float shade=smoothstep(.013,.014,length(moon-vec2(.006,-.004)));
        c+=vec3(.59,.77,.89)*(disk*shade+exp(-m*16.)*.28*night);
        float sun=length((uv-vec2(.72,mix(.21,.44,dusk)))*vec2(aspect,1.));
        c+=vec3(.52,.30,.09)*(exp(-sun*8.)*.55+(1.-smoothstep(.021,.022,sun))*.29)*(1.-night)*(1.-rain*.8);
        c+=vec3(.70,.84,1.)*stars(uv,night)*(1.-rain*.84);
        // Undulating lower edge and vertical rays, as in the Biplanes aurora.
        float ribbon=uv.y-(.245+.025*sin(uv.x*6.+clock*.18)+.014*sin(uv.x*12.-clock*.16));
        float aurora=exp(-abs(ribbon)*70.)*.23;
        float rays=smoothstep(.24,.76,noise(vec2(uv.x*52.+clock*.13,uv.y*.75)));
        aurora+=smoothstep(-.101,-.014,ribbon)*(1.-smoothstep(-.011,.006,ribbon))*(.14+.34*rays);
        c+=mix(vec3(.074,.62,.45),vec3(.32,.25,.70),clamp(-ribbon*13.,0.,1.))*aurora*
          night*(1.-rain*.91)*smoothstep(.14,.36,uv.x)*(1.-smoothstep(.76,1.,uv.x));
        float cloud=noise(vec2(uv.x*5.+clock*.019,uv.y*20.))*.68+noise(vec2(uv.x*13.+clock*.033,uv.y*45.))*.32;
        c=mix(c,mix(vec3(.94,.79,.73),vec3(.23,.34,.50),night),smoothstep(.53,.80,cloud)*(.19+.29*rain)*(1.-smoothstep(.40,.62,uv.y)));
        gl_FragColor=vec4(driftingSky(c,uv,night),1.);
      }else if(layer>5.5){
        // Two remapped wave layers and a foam texture from 2d_water.
        // World Y runs down the fall, so the sampled texture scrolls upward.
        float t=clock;
        vec2 a=vec2(uv.x*.95+t*.025,uv.y*.71-t*.63);
        vec2 b=vec2(uv.x*1.80-t*.032,uv.y*1.18-t*.47);
        vec3 first=texture2D(waveMap,fract(a)).rgb;
        vec3 second=texture2D(waveMap,fract(b)).rgb;
        vec3 swell=texture2D(swellMap,fract(vec2(uv.x*.57+t*.013,uv.y*1.56-t*.33))).rgb;
        float waves=.55*first.r+.29*second.r+.16*swell.r;
        float edge=mix(flowPath.x,flowPath.y,uv.y)+.035*(waves-.5);
        float body=1.-smoothstep(flowPath.z*.36,flowPath.z*.62,abs(uv.x-edge));
        float foam=smoothstep(.51,.69,waves)*smoothstep(.29,.73,swell.b);
        float ripple=smoothstep(.39,.57,waves)*.31+foam*.69;
        vec3 water=mix(vec3(.39,.67,.82),vec3(.98,.91,.76),ripple);
        float fade=smoothstep(0.,.065,uv.y)*(1.-smoothstep(.77,1.,uv.y));
        gl_FragColor=vec4(water,body*fade*(.25+.38*ripple));
      }else if(layer>4.5){
        float w=.11+uv.y*.06;
        float middle=.47+.10*uv.y+.03*sin(uv.y*22.-clock*2.);
        float flow=1.-smoothstep(w*.32,w,abs(uv.x-middle));
        float ripples=.42+.58*noise(vec2(uv.x*16.,uv.y*37.-clock*4.));
        float fade=smoothstep(0.,.08,uv.y)*(1.-smoothstep(.72,1.,uv.y));
        gl_FragColor=vec4(mix(vec3(.65,.88,1.),vec3(.23,.51,.77),night),flow*fade*ripples*.86);
      }else if(layer>3.5){
        float vapor=noise(vec2(uv.x*4.-clock*.025,uv.y*12.))*.66+noise(vec2(uv.x*10.-clock*.037,uv.y*27.))*.34;
        float fog=smoothstep(.45,.81,vapor)*smoothstep(.29,.67,uv.y)*(.11+.31*rain);
        vec2 streak=vec2((uv.x+uv.y*.15)*102.,uv.y*25.-clock*8.);
        float drops=(1.-smoothstep(.018,.069,abs(fract(streak.x)-.5)))*smoothstep(.62,.83,fract(streak.y+hash(vec2(floor(streak.x),3.))*8.))*rain*.28;
        gl_FragColor=vec4(mix(vec3(.68,.81,.85),vec3(.43,.58,.74),night),clamp(fog+drops,0.,.60));
      }else{
        vec4 s=texture2D(picture,region.xy+uv*region.zw);
        if(layer<1.5){
          // Fade the painted horizon. Keep dark silhouettes of branches.
          float tree=1.-smoothstep(.25,.53,max(max(s.r,s.g),s.b));
          float horizon=smoothstep(.166,.309,uv.y);
          s.a*=mix(max(tree,horizon),smoothstep(.195,.35,uv.y),fire);
        }
        if(layer>3.15&&layer<3.45)
          s.a*=smoothstep(0.,.15,uv.y)*(1.-smoothstep(.88,1.,uv.y));
        vec3 tint=mix(vec3(1.02,1.015,.98),vec3(1.07,.93,.95),dusk*.64);
        tint=mix(tint,vec3(.35,.51,.77),night);
        tint*=1.-rain*.20;
        vec3 c=mix(s.rgb*tint,mix(vec3(.51,.71,.78),vec3(.12,.23,.40),night),haze);
        c=mix(c,mix(c*vec3(1.12,.90,.93),vec3(.85,.37,.28),(1.-smoothstep(.20,.64,uv.y))*.26),fire);
        if(layer>3.05&&layer<3.15){
          float relief=dot(s.rgb,vec3(.28,.53,.19));
          c=mix(vec3(124.,31.,78.)/255.,vec3(255.,184.,148.)/255.,smoothstep(.19,.92,relief));
        }
        gl_FragColor=vec4(c,s.a*opacity);
      }
    }
  `;

  function compile(gl,type,source){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  function image(name,detail=false){
    const img=new Image();
    const prefix=detail&&name.startsWith('biplanes-')&&!name.startsWith('biplanes-cloud-')?'detail/':'';
    const path='assets/depth/'+prefix+name+'.webp';
    img.src=window.groveAsset?window.groveAsset(path):path;
    return img.decode().then(()=>img);
  }

  async function mount(canvas,{preview=false,control=canvas,sequence=null,gameSunset=false,detail=false}={}){
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false});
    if(!gl)throw Error('WebGL unavailable');
    const assetNames=['valley','mid','biplanes-green-04','biplanes-green-01','biplanes-spectre-03',
      'biplanes-green-00','biplanes-green-02','biplanes-snow-03','biplanes-storm-02',
      'biplanes-spectre-01','biplanes-lava-04','biplanes-cloud-03','biplanes-cloud-09','biplanes-cloud-12'];
    const assets=await Promise.all(assetNames.map(name=>image(name,detail)));
    const maps=sequence?await Promise.all(sequence.water.map(async src=>{
      const map=new Image();map.src=src;await map.decode();return map;
    })):[];
    const program=gl.createProgram();
    gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fragment));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);
    const corner=gl.getAttribLocation(program,'corner');
    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner,2,gl.FLOAT,false,0,0);
    const names=['card','view','depth','region','clock','phase','rain','layer','haze','aspect','opacity','fire','skyRise','flowPath'];
    const u=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
    const fx=document.createElement('canvas');
    fx.width=320;fx.height=560;
    const drawFx=fx.getContext('2d');
    const nestFx=document.createElement('canvas');
    nestFx.width=200;nestFx.height=150;
    const drawNest=nestFx.getContext('2d');
    function texture(source){
      const tex=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      return tex;
    }
    const [land,canopy,...library]=assets.map(texture);
    const life=texture(fx),distant=texture(fx),resident=texture(nestFx);
    const waterMaps=maps.map(texture);
    if(waterMaps.length){
      waterMaps.forEach((tex,index)=>{
        gl.activeTexture(gl.TEXTURE1+index);gl.bindTexture(gl.TEXTURE_2D,tex);
      });
      gl.uniform1i(gl.getUniformLocation(program,'waveMap'),1);
      gl.uniform1i(gl.getUniformLocation(program,'swellMap'),2);
      gl.activeTexture(gl.TEXTURE0);
    }
    const formations=[[0,2,1],[3,4,6],[7,8,5],[4,2,3]];
    let formation=0;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    const whole=[0,0,1,1];
    let phase=0,rain=0,wantPhase=0,wantRain=0,x=0,y=0,wantX=0,wantY=0,viewX=0,viewY=0,frame=0,last=0;
    const horizon=[
      [-1.18,.13,.22,.20,2,14],[-.81,-.36,.26,.22,1,11],[-.38,.15,.15,.12,3,12],
      [.24,.20,.18,.15,4,14],[.76,-.37,.22,.21,6,11],[1.15,.12,.24,.18,0,13],
    ];
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const clamp=value=>Math.max(-1,Math.min(1,value));
    function aim(event){
      const box=control.getBoundingClientRect();
      wantX=clamp((event.clientX-box.left)/box.width*2-1)*.40;
      wantY=clamp(1-(event.clientY-box.top)/box.height*2)*.25;
    }
    control.addEventListener('pointermove',aim,{passive:true});
    control.addEventListener('pointerleave',()=>{wantX=wantY=0;});
    function quad(kind,z,nx,ny,w,h,tex,source=whole,mist=0,opacity=1){
      gl.uniform1f(u.layer,kind);gl.uniform1f(u.depth,z);
      gl.uniform4f(u.card,nx*z,ny*z,w*z,h*z);
      gl.uniform4fv(u.region,source);gl.uniform1f(u.haze,mist);gl.uniform1f(u.opacity,opacity);
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    function render(now,camera){
      const t=reduced.matches?0:now/1000;
      const sunset=Boolean(camera)||(gameSunset&&phase<.82);
      const ease=reduced.matches?1:.16;
      phase+=(wantPhase-phase)*ease;rain+=(wantRain-rain)*ease;
      x+=(viewX+(reduced.matches?0:wantX)-x)*ease;y+=(viewY+(reduced.matches?0:wantY)-y)*ease;
      if(camera){
        x=camera.x;y=camera.y;phase=.5;rain=0;
      }
      gl.uniform1f(u.fire,sunset?1:0);
      gl.uniform1f(u.skyRise,camera?.045+camera.y*.026:gameSunset?.075:0);
      gl.uniform1f(u.clock,t);
      gl.uniform1f(u.rain,rain);
      gl.uniform1f(u.phase,phase);
      gl.uniform1f(u.aspect,canvas.width/canvas.height);
      gl.clearColor(.12,.20,.31,1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform3f(u.view,x,y,0);
      quad(0,18,0,sunset?.24:0,gameSunset?2.65:2.19,sunset?2.98:2.13,land);
      const landX=camera?-.49:0,landWidth=gameSunset?2.83:sunset?2.46:2.04,landHeight=sunset?2.32:2.04;
      quad(1,11,landX,0,landWidth,landHeight,land);
      if(!reduced.matches){
        drawFx.clearRect(0,0,fx.width,fx.height);
        GroveWaterfalls.draw(drawFx,t,0,0,fx.width,fx.height);
        gl.bindTexture(gl.TEXTURE_2D,life);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,fx);
        quad(2,11,landX,0,landWidth,landHeight,life);
        drawFx.clearRect(0,0,fx.width,fx.height);
        GroveWaterfalls.drawDistant(drawFx,t,fx.width,fx.height);
        gl.bindTexture(gl.TEXTURE_2D,distant);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,fx);
        quad(2,13.7,0,sunset?.23:0,2.60,1.98,distant,whole,.11);
      }
      if(camera)for(const {top,bottom,start,end,width} of GroveWaterfalls.streams){
        const span=Math.abs(start-end)+width*2.2;
        const center=(start+end)/2;
        gl.uniform4f(u.flowPath,.5+(start-center)/span,.5+(end-center)/span,width/span,0);
        quad(6,11,landX+(center-.5)*landWidth,(.5-(top+bottom)/2)*landHeight,span*landWidth,(bottom-top)*landHeight,land);
      }
      const highY=.28+.012*Math.sin(t*.32),nearY=(gameSunset?.51:-.12)+.014*Math.sin(t*.29+2);
      const [high,middle,near]=formations[formation].map(index=>library[index]);
      const drift=t*.047;
      if(gameSunset)horizon.forEach(([px,py,wide,tall,sprite,z],i)=>{
        quad(3,z,px+.032*Math.sin(t*.33+i*2),py+.012*Math.sin(t*.41+i),wide,tall,library[sprite],whole,.30+i%2*.14);
      });
      if(sunset){
        quad(3.1,15,.56+.12*Math.sin(drift),.77,1.24,.31,library[9],whole,0,.73);
        quad(3.1,14,-.50-.19*Math.sin(drift*.58+.5),.71,1.12,.22,library[11],whole,0,.57);
        quad(3.1,12,-.74+.16*Math.sin(drift*.75),.27,1.14,.18,library[10],whole,0,.54);
      }
      quad(3,10,-.30+.20*Math.sin(drift),.46,.87,.17,library[9],whole,.42,.44+rain*.17);
      quad(3,9,-.56,highY,.27,.15,high,whole,.26);
      quad(3,8,camera?.15:.77,.41+.008*Math.sin(t*.24+2),.18,.11,middle,whole,.31);
      quad(3,7,.12+.24*Math.sin(drift*.83+1),-.30,.95,.10,library[10],whole,.36,.35+rain*.17);
      quad(3,6,.64,nearY,.44,.25,near,whole,.12);
      if(formation===0)quad(5,6,.67,nearY-.042,.064,.22,land);
      if(!reduced.matches){
        drawNest.clearRect(0,0,nestFx.width,nestFx.height);
        GroveWaterfalls.drawResident(drawNest,t,nestFx.width,nestFx.height);
        gl.bindTexture(gl.TEXTURE_2D,resident);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,nestFx);
        quad(2,6,.64,nearY+.062,.65,.31,resident,whole,.12);
      }
      if(preview)quad(camera?3.3:3,4,0,0,camera?2.61:2.19,camera?2.67:2.15,canopy,whole,.04);
      if(camera)quad(3.1,5,.73-.18*Math.sin(drift),-.33,1.34,.17,library[11],whole,0,.56);
      quad(3,4,-.59-.24*Math.sin(drift*.67+2),-.48,1.04,.12,library[11],whole,.34,.31+rain*.17);
      quad(4,3,0,0,2.44,2.32,land);
    }
    function tick(now){
      if(now-last>=30){render(now);last=now;}
      frame=requestAnimationFrame(tick);
    }
    function restart(){
      cancelAnimationFrame(frame);
      if(document.hidden)return;
      render(performance.now());
      if(!reduced.matches)frame=requestAnimationFrame(tick);
    }
    if(sequence)gl.viewport(0,0,canvas.width,canvas.height);
    else new ResizeObserver(()=>{
      const ratio=Math.min((devicePixelRatio||1)*(detail?1.15:1),detail?2.65:1.5,(detail?1780:900)/Math.max(canvas.clientHeight,1));
      canvas.width=Math.max(1,Math.round(canvas.clientWidth*ratio));
      canvas.height=Math.max(1,Math.round(canvas.clientHeight*ratio));
      gl.viewport(0,0,canvas.width,canvas.height);
      render(performance.now());
    }).observe(canvas);
    if(!sequence){
      reduced.addEventListener('change',restart);
      document.addEventListener('visibilitychange',restart);
    }
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();
      cancelAnimationFrame(frame);
      canvas.classList.remove('valley-ready');
      canvas.parentElement?.classList.remove('valley-active');
    });
    if(!sequence)restart();
    canvas.classList.add('valley-ready');
    return {
      drawSequence(time,camera){render(time*1000,camera);},
      setVantage(px,py){viewX=px;viewY=py;if(reduced.matches)render(performance.now());},
      cycleIslands(){
        formation=(formation+1)%formations.length;
        if(reduced.matches)render(performance.now());
      },
      setAtmosphere(time,weather){
        if(detail)window.dispatchEvent(new CustomEvent('grove-atmosphere',{detail:{phase:time}}));
        wantPhase=Math.min(1,Math.max(0,time));
        wantRain=Math.min(1,Math.max(0,weather));
        if(reduced.matches)render(performance.now());
      }
    };
  }
  window.GroveValley={mount};
  const plane=document.querySelector('.depth-plane.far');
  if(plane){
    const canvas=document.createElement('canvas');
    canvas.className='valley-scene';
    canvas.setAttribute('aria-hidden','true');
    plane.prepend(canvas);
    const params=new URLSearchParams(location.search);
    mount(canvas,{control:document.getElementById('habitat'),gameSunset:!params.has('sky'),detail:true}).then(scene=>{
      plane.classList.add('valley-active');
      GroveValley.setAtmosphere=scene.setAtmosphere;
      GroveValley.setVantage=scene.setVantage;
      if(window.GroveDepth)scene.setVantage(...GroveDepth.vantage);
      const time={day:0,dusk:.5,night:1}[params.get('sky')]??0;
      scene.setAtmosphere(time,params.get('weather')==='rain'?1:0);
    }).catch(()=>canvas.remove());
  }
})();
