/* ToysBerry · articulated cut-paper dragons. Local 480 × 320 drawing coordinates. */
(() => {
  'use strict';
  // Body, sunlit scales, deep scales, secondary material, its light, belly, ink, and iris.
  const species = [
    ['Плющ','Лиственный','leaf',['#72b869','#a5d985','#3f8067','#e78396','#ffb4b5','#f6dea0','#304e47','#955627'],[57,32,49,60],[-85,-42]],
    ['Шёлк','Небесный змей','silk',['#70b9bd','#a5ddd2','#427e91','#edac65','#ffdb8d','#f2dcbc','#314c60','#9c553a'],[61,20,52,32],[-104,-50]],
    ['Уголёк','Огненная виверна','wyvern',['#de8260','#f6b27c','#ac554a','#668f90','#a4c9a4','#ffe0a2','#613d42','#8d4d27'],[55,30,34,57],[-79,-40]],
    ['Пончик','Каменный','stone',['#ad9382','#d6b79b','#786978','#879a9c','#bec6b2','#f1d0a7','#4c4653','#704630'],[65,48,63,53],[-72,-27]],
    ['Громик','Грозовой','storm',['#6d8cba','#9db8d9','#4e6094','#efbd58','#ffe29b','#d9e1d4','#374360','#9c5e22'],[53,28,49,68],[-93,-40]],
    ['Волна','Приливный','tide',['#60bcb0','#9cddc0','#387c88','#e6958b','#ffbfab','#eddfb2','#2e5660','#a15c39'],[59,29,56,45],[-86,-33]],
    ['Триша','Цветочная гидра','hydra',['#99b974','#c4d788','#637f68','#ce829b','#f1b3b1','#eadba6','#4f5460','#805333'],[60,33,58,53],[-86,-60]],
    ['Сумрак','Ночной','night',['#756897','#aa90bb','#504866','#aa81b8','#d8b2cc','#c5add0','#383249','#eab95e'],[52,28,43,60],[-80,-42]],
    ['Янтарь','Золотой венценосец','royal',['#e4ac4f','#f5cf79','#b57549','#7d994f','#bed684','#ffebad','#69513b','#99602b'],[55,29,51,68],[-84,-68]],
    ['Люма','Лунный фонарик','moth',['#92bcb3','#c2d9bb','#628d91','#a491c1','#d8c8dc','#ffeaa1','#435c64','#8e5943'],[50,33,44,44],[-67,-30]]
  ];
  const families = species.map(([name,family,kind,colors]) => Object.freeze({name,family,kind,color:colors[0],accent:colors[3]}));
  const cache = new Map();
  const pi = Math.PI, tau = pi*2, sin = Math.sin, cos = Math.cos;
  const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
  const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;
  const poses = new Set(['idle','sleep','cuddle','purr','growl','angry','bite','hang','hop','takeoff','fly','land']);
  function pattern(d) {
    let shape=cache.get(d);
    if (!shape) {shape = new Path2D(d);cache.set(d,shape);}
    return shape;
  }
  function smoothOutline(points) {
    const out = new Path2D();
    const n = points.length, last = points[n-1];
    out.moveTo((last[0]+points[0][0])*.5,(last[1]+points[0][1])*.5);
    for (let i=0;i<n;i++) {
      const [x,y]=points[i], next=points[(i+1)%n];
      out.quadraticCurveTo(x,y,(x+next[0])*.5,(y+next[1])*.5);
    }
    out.closePath();return out;
  }
  // Build a tapered skin around a chain of joint centres. Both sides follow its bend.
  function skin(points, radii) {
    const upper=[],lower=[];
    points.forEach(([x,y],i) => {
      const p=points[Math.max(0,i-1)],q=points[Math.min(points.length-1,i+1)];
      const a=Math.atan2(q[1]-p[1],q[0]-p[0])+pi*.5;
      const dx=cos(a)*radii[i],dy=sin(a)*radii[i];
      upper.push([x+dx,y+dy]);lower.push([x-dx,y-dy]);
    });
    return smoothOutline([...upper,...lower.reverse()]);
  }
  // Each joint inherits the transform of its parent. Bends change local joint angles.
  function articulate(root, lengths, rest, bend) {
    const points=[root];let a=0, prev=0;
    for(let i=0;i<lengths.length;i++) {
      a += rest[i]-prev + bend(i); prev=rest[i];
      const p=points[i];points.push([p[0]+lengths[i]*cos(a),p[1]+lengths[i]*sin(a)]);
    }
    return {points,angle:a};
  }
  function draw(ctx,state={}) {
    if (!ctx) return;
    const index=clamp(Math.trunc(finite(state.index,0)),0,9);
    const stage=clamp(Math.trunc(finite(state.stage,0)),0,2);
    const pose=poses.has(state.pose)?state.pose:'idle';
    const t=finite(state.time,0), amp=clamp(finite(state.amount,1),0,1);
    const sway=clamp(finite(state.sway,0),-1,1), s=stage/2;
    const [, ,kind,colors,sizes,neckEnd]=species[index];
    const colorsByName=['body','light','deep','accent','tip','cream','ink','iris'];
    const [body,light,deep,accent,tip,cream,ink,iris]=state.palette ? colors.map((v,i)=>state.palette[colorsByName[i]] || v) : colors;
    const [width,height,hip,legs]=sizes, leaf=kind==='leaf', silk=kind==='silk', wyvern=kind==='wyvern',
      stone=kind==='stone', storm=kind==='storm', tide=kind==='tide', hydra=kind==='hydra',
      night=kind==='night', royal=kind==='royal', moth=kind==='moth';
    const action = name => pose===name?amp:0;
    const sleep=action('sleep'), hang=action('hang'), cuddle=action('cuddle'), purr=action('purr');
    const mad=Math.max(action('angry'),action('growl')*.82),bite=action('bite');
    const hz=sin(t*(silk?2:2.7)+index*.71), breath=sin(t*2.25+index*.47);
    const phase=Number.isFinite(state.progress)?clamp(state.progress,0,1):((t%1)+1)%1;
    const hop=action('hop')*Math.max(0,sin(phase*pi));
    const rise=action('takeoff')*clamp(phase*1.75,0,1);
    const settle=action('land')*(1-clamp(phase*1.5,0,1));
    const air=Math.max(action('fly'),rise,settle);
    const snap=bite*(.25+.75*Math.pow(Math.max(0,sin(t*8)),.7));
    const flap=air*sin(t*(moth?11.4:8.2)+.25);
    const swing=hang*(sway*.75+.39*sin(t*3.5));
    const frameScale=[.76,.91,1][stage], bodyMul=[.79,.91,1][stage];
    const stance=legs*([.75,.91,1][stage]);
    const footY=285;
    const flip=bite && finite(state.targetX,0)>249 ? -1 : 1;
    const y=footY-frameScale*stance+sleep*(stance*.57)-hang*63-hop*52-air*47+1.4*breath*(1-sleep);
    const bob=purr*sin(t*19)*.8;
    function paint(path,fill,stroke=ink,thick=2.3) {
      const p=typeof path==='string'?pattern(path):path;
      if (fill) {ctx.fillStyle=fill;ctx.fill(p);}
      if (stroke && thick>0) {ctx.lineWidth=thick;ctx.strokeStyle=stroke;ctx.stroke(p);}
    }
    function oval(x,y,rx,ry,fill,stroke=null,thick=2,angle=0) {
      const p=new Path2D();p.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),angle,0,tau);paint(p,fill,stroke,thick);
    }
    function joint(x,y,angle,sx,sy,fn) {
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(sx,sy);
      try {fn();} finally {ctx.restore();}
    }
    function feather(x,y,len,thick,angle,col,lit=tip) {
      joint(x,y,angle,len/36,thick/13,()=>{
        paint('M -3 0 Q 10 -19 37 -2 Q 26 12 6 7 Q -1 6 -3 0Z',col,ink,1.65);
        paint('M 2 3 Q 19 2 31 -1 Q 17 6 7 6Z',lit,null);
      });
    }
    function spike(x,y,angle,scale,col) {
      joint(x,y,angle,scale,scale,()=>{
        paint('M -8 3 Q -6 -9 5 -26 Q 8 -11 10 1 Q 3 7 -8 3Z',col,ink,2);
        paint('M 3 -18 Q 1 -5 -4 1 L 1 1Z',tip,null);
      });
    }
    function tail() {
      const root=[width*bodyMul*.62,1];
      const lengths=silk?[24,26,28,25,22,15,12]:stone?[18,17,15,12,8,5]:moth?[12,13,11,9,5,4]:[19,23,23,20,15,10];
      const degrees=silk?[17,28,4,-28,-51,-85,-115]:stone?[12,26,12,-12,-22,-40]:moth?[28,16,-15,-30,-55,-60]:
        tide?[18,11,-8,-24,-38,-55]:[19,23,4,-22,-46,-78];
      const a=degrees.map((v,i)=>(v+hang*(i<2?51:20)-air*(i<2?21:12)+sleep*(i<2?-18:-13))*pi/180);
      const long=[.75,.90,1][stage];
      const chain=articulate(root,lengths.map(v=>v*long),a,i=>
        sin(t*(mad?6:2.7)-i*.8)*(.03+.025*i)*(1+mad*.7)+swing*.09);
      const pts=chain.points,end=pts.at(-1),radius=(stone?16:silk?14:moth?21:15)*bodyMul;
      const radii=pts.map((_,i)=>radius*(1-i/(pts.length-.1))+.55);
      paint(skin(pts,radii),body);
      const low=pts.map(([x,y],i)=>[x,y+radii[i]*.49]);paint(skin(low,radii.map(x=>x*.39)),deep,null);
      const crest=(i,col)=>{const p=pts[i],q=pts[i+1];if(q)feather(p[0],p[1]-radii[i]*.7,8+6*s,4+3*s,Math.atan2(q[1]-p[1],q[0]-p[0])-.85,col);};
      if (leaf||royal||silk) for(let i=2;i<pts.length-1;i+=2)crest(i,accent);
      joint(end[0],end[1],chain.angle,1,1,()=>{
        if(leaf||hydra||silk){for(const a of [-.58,.5,-.08])feather(0,0,13+16*s,6+4*s,a,accent,tip);}
        else if(tide){feather(0,0,24+13*s,10,-.64,accent);feather(0,0,21+8*s,9,.78,accent);}
        else if(stone){paint('M -8 -1 L -3 -12 L 8 -15 L 18 -8 L 21 1 L 13 12 L 1 13 L -7 6Z',accent);paint('M -2 -8 L 7 -12 L 15 -8 L 7 -2Z',tip,null);}
        else if(storm){paint('M -4 0 L 12 -8 L 8 -1 L 26 -4 L 6 9 L 10 2Z',accent);}
        else if(royal||night){paint('M -4 0 Q 9 -12 22 -11 Q 17 -3 28 1 Q 15 8 3 6Z',accent);}
        else if(moth){oval(5,0,10+5*s,7+3*s,cream,ink);oval(7,-2,4,2,'#fff2b8');}
      });
    }
    function paw(x,y,rear,far) {
      const shortening=[.78,.91,1][stage],col=far?deep:body;
      const restThigh=rear?.57:-.02, restShin=rear?-.52:.03;
      const upper=stance*(rear?.46:.48), lower=(stance-5-upper*cos(restThigh))/cos(restShin);
      const gain=hang?1.15:1;
      const thigh=restThigh+air*(rear?-.91:-1.10)+sleep*(rear?-.78:.96)
        +hang*(rear?-.67:.09)+swing*(rear?-.75:.79)+hop*(rear?-.49:.43)+(far?-.14:0);
      const shin=restShin+air*(rear?-.35:.98)+sleep*(rear?1.64:-1.63)
        +hang*(rear?.48:-.16)+swing*(rear?.54:-.55)+hop*(rear?.52:-.39);
      const knee=[x-sin(thigh)*upper,y+cos(thigh)*upper];
      const ankle=[knee[0]-sin(shin)*lower*gain,knee[1]+cos(shin)*lower*gain];
      const thick=(stone?12.6:rear?11.6:7.9)*shortening;
      const nearAnkle=[ankle[0]+sin(shin)*4,ankle[1]-cos(shin)*4];
      const points=[[x,y-4],[x+(rear?6:1),y+6],knee,nearAnkle,ankle];
      const widths=[thick*.67,thick*(rear?1.38:.9),thick*.70,thick*.53,thick*.44];
      // Continuous skin and softly folded hock, with no seam across either joint.
      paint(skin(points,widths),col,ink,2);
      if(!far){
        const shade=points.map(([a,b],i)=>[a+widths[i]*.47,b+1]);
        paint(skin(shade,widths.map(v=>v*.34)),deep,null);
      }
      const toeAngle=air*(-.70)+hang*(-.83)+swing*(far?.26:.48)+hop*.23;
      joint(ankle[0],ankle[1],toeAngle,shortening,shortening,()=>{
        const feet=stone?1.24:1;
        joint(0,0,0,feet,1,()=>{
          paint('M 3 -5 C 4 -1 7 2 5 5 Q 1 8 -11 7 C -17 7 -20 4 -16 1 Q -12 -2 -7 -2 Q -4 -5 -3 -7',col,ink,2);
          if(!far){paint('M -15 4 Q -13 1 -11 2 M -10 5 Q -8 2 -6 3',null,cream,1.7);}
        });
      });
    }
    function fins(x,y,rear,far) {
      const angle=rear?.57:1.7;
      joint(x,y,angle+air*.36+hang*.46+swing*.42+sin(t*3+(rear?1:0))*.12,1,1,()=>{
        const l=(rear?23:33)*(.80+.20*s);
        feather(0,0,l,11,0,far?deep:accent,far?body:tip);
        feather(0,0,l*.78,7,.44,far?deep:accent,tip);
      });
    }
    function bodySkin() {
      joint(0,0,0,width*bodyMul/58,height*bodyMul/32,()=>{
        paint('M -59 -3 C -60 -21 -42 -33 -18 -35 C 4 -38 32 -32 48 -21 C 67 -9 66 9 54 21 C 39 37 14 37 -11 31 C -37 31 -56 22 -59 -3Z',body);
        paint('M -58 0 Q -44 24 -18 23 Q 10 34 44 21 Q 29 38 5 34 Q -42 34 -55 17Z',cream,null);
        paint('M 10 -31 Q 41 -31 53 -13 Q 63 6 48 18 Q 47 1 35 -9 Q 25 -21 12 -23Z',deep,null);
        paint('M -36 -21 Q -19 -34 4 -29 Q -15 -29 -26 -18Z',light,null);
        if(stone){
          const plates=[[-30,-23,1],[-5,-33,1.2],[24,-25,1.08],[45,-10,.78]];
          for(const [px,py,sc] of plates.slice(0,2+stage))joint(px,py,0,sc*.88,sc*.9,()=>{
            paint('M -15 2 L -12 -8 L -2 -16 L 11 -14 L 18 -3 L 15 8 L 2 11Z',accent,ink,1.9);paint('M -11 -7 L -2 -13 L 10 -11 L 1 -5Z',tip,null);
          });
        } else if(moth) {
          oval(26,5,25,20,accent,ink,1.8,.12);oval(29,4,17,14,cream,null,1,.1);oval(33,-1,6,4,'#fff5bf');
          paint('M 11 -7 Q 19 2 13 14 M 25 -12 Q 33 0 28 18',null,deep,2.2);
          for(let i=0;i<5;i++)feather(-36+i*2,-18+i*7,17,8,2.8-i*.21,light);
        } else if(storm){paint('M -21 -11 L 2 -19 L -4 -7 L 21 -13 L -7 9 L -1 -5 L -23 1Z',accent,null);}
        else if(night){paint('M -4 -17 A 14 14 0 0 0 15 -3 A 15 15 0 0 1 -4 -17Z',cream,null);oval(26,-10,2.4,2,tip);}
        else if(silk||tide){for(let i=0;i<3;i++)paint(new Path2D('M '+(-20+i*18)+' -20 q 14 10 9 20 q 13 -14 3 -21z'),light,null);}
        else {for(const [a,b,r] of [[6,-10,5],[17,-11,3],[26,-4,3],[-3,-5,2]])oval(a,b,r,r*.66,light,null,1,-.25);}
      });
    }
    function wing(far) {
      if(silk||tide||hydra)return;
      const scale=(.50+.50*s)*(far?.83:1);
      const x=wyvern?-32:royal?-12:moth?-13:4;
      const y=-height*bodyMul*.63;
      let angle=(far?-.33:0)+flap*.62+hang*.64+sleep*.46+sin(t*2.7+index)*.034;
      if(leaf||royal||stone) angle+=.21;
      const up=flap<0?1+(-flap)*.24:1-flap*.84;
      joint(x+(far?3:0),y,angle,scale,scale,()=>{
        if(wyvern){
          // Shoulder → folded elbow → wrist. At rest the hooked wrist supports the body.
          const wx=-22-air*5, wy=(stance-y-5)/scale*(1-air)-air*39+hang*10;
          const arm=[[-2,1],[-10,wy*.48-4],[wx,wy]];
          paint(skin(arm,[8,5.5,4.5]),far?deep:body);
          joint(wx,wy,flap*.76,1,1,()=>{
            const ny=wy+15;
            const membrane=new Path2D();
            membrane.moveTo(0,0);membrane.bezierCurveTo(9,-12,22,-ny-18,53,-ny-30);
            membrane.quadraticCurveTo(72,-ny-52,89,-ny-61);membrane.quadraticCurveTo(90,-ny-30,116,-ny-8);
            membrane.quadraticCurveTo(92,-ny-10,85,-ny+6);membrane.quadraticCurveTo(63,-ny-5,49,-ny+13);
            membrane.quadraticCurveTo(25,-ny+6,0,0);membrane.closePath();paint(membrane,far?deep:accent);
            const vein=new Path2D();vein.moveTo(4,-5);vein.quadraticCurveTo(36,-ny-5,60,-ny-29);
            vein.quadraticCurveTo(79,-ny-21,85,-ny+3);vein.moveTo(60,-ny-29);vein.quadraticCurveTo(68,-ny-12,51,-ny+9);paint(vein,null,far?ink:deep,3.6);
            if(!far){oval(0,0,6,5,body,ink,1.7);paint('M -3 -3 Q -11 -4 -14 3 Q -6 2 -1 4Z',cream,ink,1.5);}
          });return;
        }
        joint(0,0,0,1,Math.max(.22,up),()=>{
          if(leaf||royal){
            const n=royal?4:3;
            for(let i=0;i<n;i++){
              const len=(royal?70:47)+s*(royal?20:9)-i*7;
              feather(i*4,i*2,len,royal?13:12,-.63+i*.23,far?deep:(i%2?body:accent),far?body:tip);
            }
            feather(-1,0,royal?37:28,10,-.35,far?deep:light,far?body:cream);
          } else if(moth) {
            paint('M 0 0 C -8 -17 -3 -44 23 -72 C 38 -89 62 -105 78 -98 C 84 -78 69 -58 66 -48 C 80 -46 86 -37 78 -26 C 64 -8 48 -3 26 3 C 42 6 51 20 43 28 C 25 39 4 22 0 0Z',far?deep:accent);
            paint('M 5 -1 C 15 -26 38 -62 68 -83 Q 60 -55 42 -36 Q 27 -17 5 -1Z',far?body:tip,null);
            if(!far){oval(52,-56,9,13,ink,null,1,.64);oval(52,-56,6,8,cream,null,1,.64);oval(51,-57,2.6,4,accent,null,1,.64);oval(27,15,5,4,cream);}
          } else if(stone){
            paint('M -2 2 Q 0 -14 8 -23 Q 21 -33 34 -31 Q 33 -19 30 -12 Q 44 -15 49 -10 Q 35 8 15 6Z',far?deep:accent);
            paint('M 2 1 Q 16 -10 28 -23',null,far?ink:tip,3);
          } else if(storm){
            paint('M 0 1 L 12 -26 L 9 -35 L 37 -48 L 32 -61 L 77 -79 L 62 -50 L 87 -56 L 67 -29 L 80 -25 L 44 -4 L 48 -15 L 15 3Z',far?deep:accent);
            paint('M 5 -2 L 49 -44 L 37 -27 L 60 -37 L 27 -8Z',far?body:tip,null);
          } else if(night){
            paint('M -2 2 Q -1 -22 12 -45 Q 28 -79 50 -90 Q 53 -70 57 -60 Q 80 -74 105 -60 Q 92 -38 89 -11 Q 70 -24 53 -6 Q 37 -17 21 2Z',far?deep:accent);
            paint('M 1 -1 Q 23 -40 49 -82 Q 41 -54 52 -10 M 26 -40 Q 63 -51 89 -15',null,far?ink:deep,3.5);
          }
        });
      });
    }
    function antler(x,y,sz,angle) {
      joint(x,y,angle,sz,sz,()=>{
        paint('M -6 0 Q 4 -12 1 -28 L 6 -38 L 9 -26 L 19 -34 L 19 -29 L 10 -17 L 22 -21 L 21 -15 L 10 -8 L 4 2Z',accent,ink,2);
        paint('M 2 -1 Q 7 -11 7 -19',null,tip,2);
      });
    }
    function head(spec) {
      const bl=((t*.286+index*.089+spec.lag)%1+1)%1;
      const blink=bl<.044?sin((bl/.044)*pi):0;
      const shut=clamp(Math.max(blink,sleep, (purr*.8+cuddle*.69)*(.9+hz*.1)),0,1);
      const skull=[1.09,1.01,.96][stage]*(hydra?spec.size:1);
      const jawOpen=clamp(snap*.94+mad*(.18+.14*sin(t*12))+.035*(1+breath)+cuddle*.26,0,1);
      const muzzle=silk||storm||royal?1.12:stone||moth?.77:1;
      joint(spec.x,spec.y,spec.angle,skull*muzzle,skull,()=>{
        function crown(back) {
          const offset=back?-7:0, sc=.62+.38*s;
          if(leaf||hydra||royal){
            const blades=hydra?5:royal?4:3;
            for(let i=0;i<blades;i++){
              const ang=-1.2+i*.40;
              feather(8+offset, -14+i*4,sc*((royal?49:35)-i*1.2),hydra?12:9,ang,
                back?deep:(i%2?body:accent),back?body:tip);
            }
          }
          if(silk||royal){antler(8+offset,-24,sc*(royal?1.08:.95),.18);if(!back&&royal){spike(2,-28,.05,sc*.79,accent);oval(1,-27,4,5,cream,ink,1.3);}}
          else if(night){
            joint(7+offset,-23,-.17,sc,sc,()=>{
              paint('M -9 6 Q -8 -15 0 -45 Q 19 -35 16 -4Z',back?deep:body);
              paint('M -3 0 Q -3 -13 2 -32 L 9 -6Z',accent,null);
            });
          } else if(tide){
            for(let i=0;i<3;i++)feather(12+offset,-13+i*9,sc*(31-i*3),6,-.8+i*.59,back?deep:accent,tip);
          } else if(moth){
            const bend=.2*sin(t*2.5+spec.lag)+.4*hang;
            joint(7+offset,-24,bend+(back?-.5:0),sc,sc,()=>{
              paint('M 0 2 Q 2 -25 19 -39',null,ink,3.8);
              for(let i=0;i<4;i++)feather(3+i*3,-12-i*5,9,3,-1.3+i*.05,back?deep:accent,tip);
              oval(20,-39,4.5,5.5,cream,ink,1.3);
            });
          } else if(stone){
            joint(7+offset,-22,0,sc,sc,()=>{
              paint('M -8 0 L -2 -20 L 10 -27 L 12 -8 L 5 4Z',back?deep:accent);paint('M 0 -13 L 7 -22 L 7 -9Z',tip,null);
            });
          } else if(storm){
            joint(9+offset,-23,0,sc,sc,()=>{
              paint('M -8 4 L -2 -12 L 8 -15 L 9 -29 L 25 -39 L 18 -19 L 11 -14 L 12 -6 L 3 5Z',back?deep:accent);
            });
          } else if(!hydra)spike(8+offset,-23,.5,sc*(back?.85:1),back?deep:accent);
        }
        crown(true);
        const earW=stone?.62:night?1.2:1;
        feather(12,-16,(stage===0?22:26)*earW,9,-.44+hang*.5-mad*.18,deep,light);
        // Exposed lower jaw rotates about the back of the cheek, independently of the skull.
        joint(10,12,-jawOpen*.53,1,1,()=>{
          paint('M -8 -4 Q -23 0 -50 -1 Q -68 -3 -65 6 Q -60 15 -46 17 Q -25 21 -8 13 Q 1 9 0 3Z',cream);
          if(jawOpen>.13){
            paint('M -7 0 Q -28 2 -59 1 Q -59 9 -36 12 Q -19 12 -7 5Z','#74404b',null);
            oval(-40,8,11,3.5,'#df9390');paint('M -53 2 L -50 -4 L -47 3Z','#fff0cc',ink,1);
          }
        });
        paint('M 19 20 C 35 12 33 -6 23 -20 C 13 -34 -4 -38 -20 -30 Q -34 -26 -37 -12 Q -39 -4 -48 -2 C -63 -2 -68 10 -60 17 Q -48 25 -29 20 Q -15 18 -5 21 Q 8 25 19 20Z',body);
        paint('M -61 12 Q -55 20 -38 18 Q -20 14 -12 15 Q -18 23 -37 23 Q -57 24 -61 16Z',cream,null);
        paint('M 13 -26 Q 28 -17 28 -2 Q 31 8 22 15 Q 26 3 20 -5Z',deep,null);
        if(!hydra) { if(leaf||royal)feather(18,-12,23+stage*4,7,-.2,accent,tip);
          if(tide)for(let i=0;i<2;i++)feather(15,-2+i*7,15+6*s,5,.20+i*.39,accent,tip);
          if(silk)feather(14,9,23+8*s,7,.64,accent);
        }
        crown(false);
        // Readable asymmetric eyes in three-quarter profile; highlights stay on the iris.
        const eye=(ex,ey,r,far)=>{
          joint(ex,ey,mad*.19+(far?.07:-.04),r/9,r/9,()=>{
            if(shut>.53 && (cuddle>.5 || purr>.5)){paint('M -8 2 Q -1 -5 8 1',null,ink,2.8);return;}
            if(shut>.92){paint('M -8 0 Q 0 6 8 -1',null,ink,2.9);return;}
            ctx.save();ctx.scale(1,Math.max(.11,1-shut));
            paint('M -9 1 C -9 -7 -4 -11 2 -10 Q 10 -9 10 -1 Q 11 7 4 9 Q -4 11 -9 4Z','#fff4d9',ink,1.8);
            oval(-2,0,6.1,8.2,iris);oval(-3,-.2,3.9,6.3,ink);oval(-4.8,-3.5,2.1,2.7,'#fffbed');ctx.restore();
          });
        };
        eye(-30,-10,stage===0?4.5:4.1,true);
        eye(-11,-12,(stage===0?12.9:stage===1?11.2:10.3)*(stone?1.04:1),false);
        if(mad>.08||storm||night){
          joint(-12,-21,-mad*.24,1,1,()=>paint('M -11 2 Q -3 -3 7 -4',null,ink,2.4+mad));
        }
        oval(-53,6,2.8,1.8,ink,null,1,-.3);
        if(jawOpen<.23)paint('M -59 15 Q -47 20 -32 15 Q -28 14 -27 12',null,ink,1.6);
        if(storm)paint('M -3 -28 L 4 -31 L 1 -25 L 8 -28 L 2 -20Z',accent,null);
        if(royal){oval(2,-22,4.3,5.5,accent,ink,1.3);oval(1,-24,1.2,1.8,tip);}
        if(night)paint('M -5 -26 Q 1 -31 9 -22 Q 2 -26 -4 -21Z',tip,null);
        if(stone){paint('M -43 19 Q -40 11 -33 7 Q -32 16 -37 21Z','#fff1ce',ink,1.5);}
        if(silk){
          const q=new Path2D();q.moveTo(-49,12);q.bezierCurveTo(-59,17,-71,0,-77,4+4*hz);q.quadraticCurveTo(-83,9,-81,15);paint(q,null,ink,2.7);
          const beard=new Path2D();beard.moveTo(-32,20);beard.quadraticCurveTo(-31,32,-18,35+3*hz);beard.quadraticCurveTo(-21,28,-18,25);paint(beard,accent,ink,1.4);
        }
        if(hydra) {oval(-3,7,3.2,2.3,accent);oval(4,5,2,1.6,accent);}
        else if(moth||cuddle>.1||purr>.1){oval(0,7,6.4,3.3,'#e49a91',null,1,-.13);}
        else{oval(0,7,2.3,1.8,light);oval(6,5,1.5,1.3,light);}
      });
    }
    function neck(n, back) {
      const posScale=[.77,.9,1][stage];
      const ex=n.x*posScale - snap*(hydra?12:24) - cuddle*5;
      const aim=clamp((finite(state.targetY,177)-177)/100,-1,1);
      const ey=n.y*posScale + (sleep?(-n.y*posScale+stance*.28)*sleep:0)
        +hang*(silk?36:22) +bite*aim*24 -cuddle*7 -hop*6 +air*(silk||royal?17:8);
      const rx=n.root*bodyMul, ry=-6;
      const pts=[[rx,ry],[rx-7,ry+(ey-ry)*.26],[rx+(ex-rx)*.34,ey*.75],[ex+16,ey+10],[ex,ey]];
      if (silk) {pts[1][0]+=12;pts[2][0]+=10;pts[2][1]-=13;}
      if(hydra){pts[1][0]+=n.bow;pts[2][0]+=n.bow;}
      const lengths=[],angles=[];
      for(let i=1;i<pts.length;i++){
        const dx=pts[i][0]-pts[i-1][0],dy=pts[i][1]-pts[i-1][1];
        lengths.push(Math.hypot(dx,dy));angles.push(Math.atan2(dy,dx));
      }
      const c=articulate(pts[0],lengths,angles,i=>(sin(t*2.15+n.lag-i*.43)*.013+swing*.045+mad*sin(t*10-i*.6)*.013));
      const points=c.points,end=points.at(-1);
      const r=(hydra?10:royal||silk?14:18)*bodyMul;
      const rings=[r*1.33,r*1.35,r*1.02,r*.79,r*.69];
      paint(skin(points,rings),back?deep:body,null);
      // Outline the flexible edges; the open shoulder disappears naturally into the torso.
      for(const sign of [-1,1]) {
        const edge=points.map(([x,y],i)=>{
          const p=points[Math.max(0,i-1)],q=points[Math.min(points.length-1,i+1)];
          const a=Math.atan2(q[1]-p[1],q[0]-p[0])+pi/2;
          return [x+sign*cos(a)*rings[i],y+sign*sin(a)*rings[i]];
        });
        const line=new Path2D();line.moveTo(...edge[1]);
        for(let i=1;i<edge.length-1;i++)line.quadraticCurveTo(...edge[i],(edge[i][0]+edge[i+1][0])/2,(edge[i][1]+edge[i+1][1])/2);
        paint(line,null,ink,2.1);
      }
      const throat=points.map(([x,y],i)=>[x-(r*.50+i*.25),y+4-i*.6]);
      paint(skin(throat,[r*.54,r*.52,r*.41,r*.34,r*.16]),back?light:cream,null);
      if(silk||royal){for(let i=1;i<4;i++)feather(points[i][0]+6,points[i][1]-4,10+i*2+s*5,6,-.8,accent);}
      return {...n,x:end[0],y:end[1],angle:-.015+hz*.038*(1-sleep)+hang*(-.24+sway*.15)
        +sleep*.03+snap*(-.08+aim*.16)-cuddle*.12+mad*.10+(hydra?.10*sin(t*2+n.lag):0)};
    }
    const foreX=-(width*.58)*bodyMul, rearX=hip*.63*bodyMul;
    function limbs(far) {
      const sx=far?13:0,ly=far?-6:-3;
      if(tide||moth&&far){fins(foreX+sx,ly+5,false,far);fins(rearX+sx,ly+7,true,far);return;}
      if(silk) {
        for(const [x,isBack] of [[foreX+sx,false],[rearX+sx,true]])joint(x,ly+1,air*.18,1,.76,()=>paw(0,0,isBack,far));
        return;
      }
      paw(rearX+sx,ly,true,far);
      if(!wyvern)paw(foreX+sx,ly,false,far);
    }
    function backOrnaments() {
      if(silk||storm||wyvern)for(let i=0;i<3+stage;i++){
        const px=(-20+i*11)*bodyMul;spike(px,-height*bodyMul+3+i*.4,.42,.36+.13*s-i*.025,accent);
      }
      if(tide){for(let i=0;i<3+stage;i++)feather(-12+i*11,-height*bodyMul+2,19+12*s-i*2,8,-1.10+i*.14,accent);}
      if(leaf)for(let i=0;i<2+stage;i++)feather(-5+i*12,-height*bodyMul+2,16+5*s,6,-.87+i*.14,accent);
    }
    ctx.save();
    try {
      ctx.lineJoin='round';ctx.lineCap='round';
      ctx.translate(245+bob,y);
      ctx.scale(frameScale*flip,frameScale);
      // Hold point sits over the shoulders. Under suspension the body and hanging joints share the pendulum.
      ctx.translate(0,-12);ctx.rotate(swing*.33+air*(.045+.038*flap)+hop*.08+snap*.03+mad*sin(t*8)*.009);ctx.translate(0,12);
      ctx.scale(1+breath*.008+purr*sin(t*18)*.005,1+breath*.014-sleep*.13);
      tail();limbs(true);wing(true);backOrnaments();
      const headList=hydra ? [
        {root:20, x:42, y:-64, size:.66,lag:3.9,bow:19},
        {root:-8,x:-28,y:-107,size:.76,lag:1.7,bow:16},
        {root:-31,x:-94,y:-56,size:.84,lag:0,bow:1}
      ]:[{root:-width*.55,x:neckEnd[0],y:neckEnd[1],size:1,lag:.05,bow:0}];
      if(hydra){for(const n of headList.slice(0,-1)){const h=neck(n,true);head(h);}}
      limbs(false);bodySkin();wing(false);
      const main=neck(headList.at(-1),false);
      head(main);
      if(moth&&!sleep&&amp>0){
        ctx.save();ctx.globalAlpha*=.35+.19*(1+sin(t*3));oval(30*bodyMul,-1,4,3,'#fff2ae');ctx.restore();
      }
    } finally {ctx.restore();}
  }
  window.DragonRig = Object.freeze({families:Object.freeze(families),draw});
})();
