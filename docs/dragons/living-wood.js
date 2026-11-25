// The renderer and every occupied perch sample the same skin weights in world space.
// A child joint inherits its parent's motion, with softer bends toward a branch tip.
const LivingWood = (() => {
  const joints = [
    // parent, hinge, influence center/radii, angular travel, delay from the trunk
    [-1,512,1460,512,1390,650,230,0,0],
    [0,498,1260,493,835,170,365,.30,0],
    [1,485,636,500,341,170,230,.74,.18],
    [2,421,369,278,256,171,158,1.35,.34],
    [3,280,255,85,239,125,146,2.3,.65],
    [2,510,296,524,108,182,125,1.8,.47],
    [2,607,428,779,289,164,135,1.55,.41],
    [6,786,304,964,270,122,143,2.65,.73],
    [2,394,470,222,384,164,85,1.6,.50],
    [1,620,758,794,652,152,91,1.2,.38],
    [9,815,674,965,626,90,89,2.9,.72],
    [1,399,990,267,942,129,66,1.25,.32],
    [11,240,947,82,927,112,70,2.55,.69],
    [1,610,1129,790,1064,158,86,1.45,.48],
    [13,827,1071,966,1036,104,91,2.6,.79],
    [1,434,1212,278,1282,116,93,.26,.25]
  ];
  const rowX=new Float32Array(joints.length*3),rowY=new Float32Array(rowX.length);
  function influences(x,y){
    const scores=joints.map((j,i)=>{
      const dx=(x-j[3])/j[5],dy=(y-j[4])/j[6];
      return [i,(dx*dx+dy*dy)];
    }).sort((a,b)=>a[1]-b[1]).slice(0,4);
    const best=scores[0][1], weights=scores.map(([,d])=>Math.exp(-2.8*(d-best)));
    const sum=weights.reduce((a,b)=>a+b,0);
    return {ids:scores.map(s=>s[0]),weights:weights.map(w=>w/sum)};
  }
  function pose(clock,gust,still){
    joints.forEach(([parent,px,py,,,,,travel,delay],index)=>{
      const t=clock-delay,wind=.79*Math.sin(t*1.13)+.27*Math.sin(t*1.87-.4);
      const a=still?0:travel*(wind+gust*Math.cos(t*2.1))*.0174533;
      const c=Math.cos(a),s=Math.sin(a),ox=px-px*c+py*s,oy=py-px*s-py*c;
      const i=index*3,k=parent*3;
      if(parent<0){rowX.set([1,0,0],i);rowY.set([0,1,0],i);return;}
      rowX[i]=rowX[k]*c+rowX[k+1]*s;rowX[i+1]=-rowX[k]*s+rowX[k+1]*c;
      rowY[i]=rowY[k]*c+rowY[k+1]*s;rowY[i+1]=-rowY[k]*s+rowY[k+1]*c;
      rowX[i+2]=rowX[k]*ox+rowX[k+1]*oy+rowX[k+2];
      rowY[i+2]=rowY[k]*ox+rowY[k+1]*oy+rowY[k+2];
    });
  }
  function sample(x,y,skin){
    let sx=0,sy=0;
    skin.ids.forEach((id,n)=>{const i=id*3,w=skin.weights[n];
      sx+=w*(x*rowX[i]+y*rowX[i+1]+rowX[i+2]);
      sy+=w*(x*rowY[i]+y*rowY[i+1]+rowY[i+2]);
    });
    return [sx-x,sy-y];
  }
  const vertex=`
    attribute vec2 xy,tex; attribute vec4 ids,weights;
    uniform vec3 jx[16],jy[16]; uniform vec4 camera; uniform mediump float terrain;
    varying vec2 uv,rest;
    vec2 joint(float id,vec3 p){return vec2(dot(jx[int(id)],p),dot(jy[int(id)],p));}
    void main(){
      rest=xy;uv=tex;vec3 p=vec3(xy,1.);
      vec2 pos=xy;
      if(terrain<.5)pos=weights.x*joint(ids.x,p)+weights.y*joint(ids.y,p)+weights.z*joint(ids.z,p)+weights.w*joint(ids.w,p);
      vec2 screen=pos*camera.xy+camera.zw;
      gl_Position=vec4(screen.x*2.-1.,1.-2.*screen.y,0.,1.);
    }`;
  const fragment=`
    precision mediump float; uniform sampler2D art;
    uniform float night,beat,terrain; varying vec2 uv,rest;
    void main(){
      vec4 c;
      if(terrain>.5){
        vec3 turf=mix(vec3(.31,.48,.39),vec3(.12,.26,.28),uv.y);
        c=vec4(turf*(.83+.33*uv.x),1.);
      }else{
        c=texture2D(art,uv); if(c.a<.004)discard;
      }
      vec3 shade=mix(c.rgb,c.rgb*vec3(.47,.60,.84)+vec3(.012,.024,.051),night);
      float radius=length((rest-vec2(501.,672.))/vec2(123.,166.));
      float light=exp(-radius*2.70)*beat;
      gl_FragColor=vec4(shade+vec3(.43,.42,.21)*light,c.a);
    }`;
  function programFor(gl){
    const p=gl.createProgram();
    for(const [kind,code] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
      const s=gl.createShader(kind);gl.shaderSource(s,code);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
      gl.attachShader(p,s);gl.deleteShader(s);
    }
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
    return p;
  }
  function texturedGrid(x,y,w,h){
    const data=[],indices=[],cols=Math.max(3,Math.ceil(w/21)),rows=Math.max(3,Math.ceil(h/20));
    for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
      const u=c/cols,v=r/rows,px=x+u*w,py=y+v*h,skin=influences(px,py);
      data.push(px,py,u,v,...skin.ids,...skin.weights);
      if(c<cols&&r<rows){const a=r*(cols+1)+c,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
    }
    return {data,indices};
  }
  // Height and face lighting are derived from the same relief. Trees meet the ground
  // at its crest; panning below the root fan reveals the near side of the slope.
  function ground(){
    const data=[],indices=[],rows=15,cols=94;
    const height=(x,z)=>28*Math.sin(x*.006+z*2.8)+15*Math.cos(x*.012-z*2.2)+7*Math.sin(x*.033+z*4);
    for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
      const z=r/rows,x=-2180+c*56+(r%2)*18,y=1470+z*1500-height(x,z);
      const normal=(height(x+7,z)-height(x-7,z))/14;
      data.push(x,y,Math.min(1,Math.max(0,.55+normal*.55)),Math.sqrt(z),0,0,0,0,1,0,0,0);
      if(c<cols&&r<rows){const a=r*(cols+1)+c,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
    }
    return {data,indices};
  }
  async function mount(canvas){
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
    if(!gl)throw Error('No WebGL');
    const p=programFor(gl);gl.useProgram(p);
    const loc=name=>gl.getUniformLocation(p,name);
    const u={jx:loc('jx[0]'),jy:loc('jy[0]'),camera:loc('camera'),terrain:loc('terrain'),night:loc('night'),beat:loc('beat')};
    const attrs=['xy','tex','ids','weights'].map(n=>gl.getAttribLocation(p,n));
    function upload({data,indices},img){
      const buffer=gl.createBuffer(),elements=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      if(img)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      return {buffer,elements,texture,count:indices.length};
    }
    const meshes=[upload(ground())];
    const sections=await Promise.all(groveSkins.map(async ([name,x,y,w,h])=>{
      const img=new Image();img.src=groveAsset('assets/depth/awakening/'+name+'.webp');await img.decode();
      return upload(texturedGrid(x,y,w,h),img);
    }));
    meshes.push(...sections);
    gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    for(const a of attrs)gl.enableVertexAttribArray(a);
    return function draw(field,world,night,beat){
      const w=field.width,h=field.height,s=world.width/1024;
      if(!w||!h||!s)return;
      const dx=world.left-field.left,dy=world.top-field.top;
      const dpr=Math.min(devicePixelRatio||1,2.5,1720/h);
      const cw=Math.max(1,Math.round(w*dpr)),ch=Math.max(1,Math.round(h*dpr));
      if(canvas.width!==cw||canvas.height!==ch){
        canvas.width=cw;canvas.height=ch;gl.viewport(0,0,cw,ch);
      }
      canvas.style.cssText='width:'+w+'px;height:'+h+'px;left:'+(-dx)+'px;top:'+(-dy)+'px';
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform4f(u.camera,s/w,s/h,dx/w,dy/h);gl.uniform3fv(u.jx,rowX);gl.uniform3fv(u.jy,rowY);
      gl.uniform1f(u.night,night);gl.uniform1f(u.beat,beat);
      for(let i=0;i<meshes.length;i++){
        const mesh=meshes[i];gl.uniform1f(u.terrain,i===0?1:0);
        gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.elements);
        attrs.forEach((a,k)=>gl.vertexAttribPointer(a,k<2?2:4,gl.FLOAT,false,48,[0,8,16,32][k]));
        gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
      }
    };
  }
  return {pose,sample,influences,mount};
})();
