'use strict';
function createListikRenderer(atlas,rigData){
  const decode=(Ctor,s)=>new Ctor(Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer);
  const c=document.createElement('canvas');c.width=1200;c.height=720;
  const gl=c.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:true});
  if(!gl)throw Error('Для просмотра откройте MP4 рядом с этой сценой.');
  const program=gl.createProgram();
  const v=`#version 300 es
  in vec3 pos;
  in vec2 st;
  in vec4 bones,weights;
  uniform mat4 pose[${rigData.bones}];
  uniform vec2 camera;
  uniform vec3 attitude;
  out vec2 uv;
  out vec3 world;
  void main(){
    mat4 model=weights.x*pose[int(bones.x)]+weights.y*pose[int(bones.y)]+
      weights.z*pose[int(bones.z)]+weights.w*pose[int(bones.w)];
    vec3 p=(model*vec4(pos,1.)).xyz-vec3(camera,0.);
    float cx=cos(attitude.x),sx=sin(attitude.x);
    float cy=cos(attitude.y),sy=sin(attitude.y);
    p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);
    p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
    world=p;
    gl_Position=vec4(p.xy/vec2(925.,555.),-p.z/1400.,1.);
    uv=st;
  }`;
  const f=`#version 300 es
  precision highp float;
  in vec2 uv;
  in vec3 world;
  uniform sampler2D atlas;
  uniform float light;
  uniform vec3 attitude;
  out vec4 pixel;
  void main(){
    vec4 s=texture(atlas,uv);
    if(s.a<.075)discard;
    vec3 normal=normalize(cross(dFdx(world),dFdy(world)));
    if(normal.z<0.)normal=-normal;
    float facing=max(0.,dot(normal,normalize(vec3(-.57,.66,.49))));
    float rim=pow(1.-abs(normal.z),2.4)*smoothstep(-.3,.9,normal.y);
    vec3 lighting=mix(vec3(1.),vec3(.76,.78,.91)+vec3(.34,.28,.13)*facing+vec3(.28,.14,.04)*rim,attitude.z);
    pixel=vec4(s.rgb*light*lighting,s.a);
  }`;
  for(const [kind,source] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){
    const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
  gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  const meshes=rigData.parts.map(part=>{
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    function buffer(target,data){
      gl.bindBuffer(target,gl.createBuffer());gl.bufferData(target,data,gl.STATIC_DRAW);
    }
    function attribute(name,size,type,stride=0,offset=0){
      const n=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(n);gl.vertexAttribPointer(n,size,type,false,stride,offset);
    }
    buffer(gl.ARRAY_BUFFER,decode(Float32Array,part.v));attribute('pos',3,gl.FLOAT,20);attribute('st',2,gl.FLOAT,20,12);
    buffer(gl.ARRAY_BUFFER,decode(Uint8Array,part.b));attribute('bones',4,gl.UNSIGNED_BYTE);
    buffer(gl.ARRAY_BUFFER,decode(Float32Array,part.w));attribute('weights',4,gl.FLOAT);
    const indices=decode(Uint16Array,part.i);buffer(gl.ELEMENT_ARRAY_BUFFER,indices);
    return {vao,count:indices.length};
  });
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  const loc=name=>gl.getUniformLocation(program,name);
  const pose=loc('pose[0]'),cam=loc('camera'),light=loc('light'),att=loc('attitude');
  const frames=decode(Float32Array,rigData.frames),stride=16*rigData.bones;
  const current=new Float32Array(stride);
  function sample(t,out){
    const f=Math.min(419,Math.max(0,t*60)),k=Math.min(139,Math.floor(f/3));
    const u=(f-3*k)/(k===139?2:3);
    for(let i=0;i<stride;i++){const a=frames[k*stride+i],b=frames[(k+1)*stride+i];out[i]=a+(b-a)*u;}
  }
  const previous=new Float32Array(stride);
  const straight=[0,0,0];
  return function(t,from,blend,camera,deform,attitude=straight){
    sample(t,current);
    if(blend<1){sample(from,previous);for(let i=0;i<stride;i++)current[i]=previous[i]+(current[i]-previous[i])*blend;}
    if(deform)deform(current,camera);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform2fv(cam,camera);gl.uniform3fv(att,attitude);gl.uniformMatrix4fv(pose,false,current);
    meshes.forEach(({vao,count},i)=>{gl.bindVertexArray(vao);gl.uniform1f(light,i===0?.87:1);gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_SHORT,0)});
    return c;
  };
}
