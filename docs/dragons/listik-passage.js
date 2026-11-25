'use strict';
const ListikPassage = (() => {
  const duration = 6.12;
  const clamp = t => Math.max(0, Math.min(1, t));
  function ease(from, to, t){
    const p = clamp((t-from)/(to-from));
    return p*p*p*(p*(6*p-15)+10);
  }
  function pose(t){
    const flight = 2.46+4.38*clamp(t/duration);
    const camera = [746-1215*ease(1.88,6.78,flight), -140+122*ease(1.94,4.83,flight)];
    const bank = ease(.45,2.24,t)*(1-ease(2.55,4.95,t));
    const yaw = .10-.17*ease(.16,3.22,t)+.04*ease(3.9,duration,t);
    return {flight,camera,bank,yaw};
  }
  const visitDuration=10.8;
  const tau=Math.PI*2;
  function encounter(t){
    const p=clamp(t/visitDuration);
    // An approach from the high canopy, a low pass, then a climbing departure.
    const approach=ease(.035,.51,p), departure=ease(.56,1,p);
    const proximity=approach*(1-departure*.85);
    const turn=ease(.15,.44,p)*(1-ease(.53,.85,p));
    const beat=tau*(.41*t+.10*Math.sin(t*.62));
    const power=1-.81*ease(.38,.51,p)*(1-ease(.71,.84,p));
    return {
      x:1.30-1.68*p-.11*approach+.085*departure,
      y:.24+.13*approach-.15*departure+.007*power*Math.sin(beat-.85),
      proximity,beat,power,
      roll:.04-.18*turn+.08*departure,
      yaw:.36-.91*approach+.28*departure,
      pitch:.055-.14*ease(.51,.91,p)+.022*power*Math.cos(beat-.42),
      flight:3.2+3.45*p
    };
  }
  function wingAndTailPose(data){
    const joints=data.joints;
    const wings=[-1,1].map(side=>({
      side,chain:joints.map((joint,index)=>({...joint,index})).filter(j=>j.name.startsWith(side<0?'Wing.Far.':'Wing.Near.'))
    }));
    const tail=joints.map((joint,index)=>({...joint,index})).filter(j=>j.name.startsWith('Tail.')||j.name==='Magnolia');
    const neck=['Neck base','Upper neck','Head and crown'].map(name=>joints.findIndex(j=>j.name===name));
    const torso=joints.findIndex(j=>j.name==='Torso');
    const radiansToDegrees=180/Math.PI;
    function hinge(parent,anchor,rotation){
      const [x,y,z]=anchor;
      return parent.translate(x,y,z).multiply(rotation).translate(-x,-y,-z);
    }
    return function sample(pose,clock,matrices,camera){
      const root=new DOMMatrix(matrices.subarray(torso*16,torso*16+16));
      const center=root.transformPoint({x:725,y:-219,z:0});
      camera[0]=center.x;camera[1]=center.y;
      for(const {side,chain} of wings){
        let parent=root,previous=new DOMMatrix();
        chain.forEach(({anchor,index},j)=>{
          const phase=pose.beat-j*(side<0?.27:.25);
          const recovery=(1-Math.cos(phase))*.5;
          // In the bind pose the near membrane drops ~16 degrees from its shoulder,
          // while the far one rises ~19 degrees. Level their physical leading edges first.
          const bindCorrection=side>0?.285:-.335;
          const lift=bindCorrection+.30-j*.046+pose.power*(.79-.047*j)*Math.cos(phase);
          // The wrist folds back on recovery, then straightens under load.
          const glide=(1-pose.power)/.81;
          const sweep=.105+.046*j+glide*(.29+.046*j)+pose.power*(.13+j*.061)*recovery;
          const twist=(.025+j*.035)*Math.sin(phase-.43)*pose.power;
          const rotation=new DOMMatrix().rotateAxisAngle(0,1,0,side*sweep*radiansToDegrees)
            .rotateAxisAngle(1,0,0,-side*lift*radiansToDegrees)
            .rotateAxisAngle(0,0,1,twist*radiansToDegrees);
          parent=hinge(parent,anchor,previous.inverse().multiply(rotation));
          matrices.set(parent.toFloat32Array(),index*16);previous=rotation;
        });
      }
      let parent=root;
      tail.forEach(({anchor,index},j)=>{
        const vertical=.072*Math.sin(clock*1.49-j*.49)+.031*pose.power*Math.sin(pose.beat-j*.42);
        const lateral=.07*Math.sin(clock*.92-j*.34)-pose.roll*.024;
        const bend=new DOMMatrix().rotateAxisAngle(0,1,0,lateral*radiansToDegrees)
          .rotateAxisAngle(0,0,1,vertical*radiansToDegrees);
        parent=hinge(parent,anchor,bend);matrices.set(parent.toFloat32Array(),index*16);
      });
      let carry=new DOMMatrix();
      neck.forEach((index,j)=>{
        const offset=index*16, original=new DOMMatrix(matrices.subarray(offset,offset+16));
        const anchor=original.transformPoint({x:joints[index].anchor[0],y:joints[index].anchor[1],z:joints[index].anchor[2]});
        const counter=.019*Math.sin(pose.beat-.8-j*.28)*pose.power+.012*Math.sin(clock*.85-j*.2);
        carry=hinge(carry,[anchor.x,anchor.y,anchor.z],new DOMMatrix().rotateAxisAngle(0,0,1,counter*radiansToDegrees));
        matrices.set(carry.multiply(original).toFloat32Array(),offset);
      });
    };
  }
  return {duration,ease,pose,visitDuration,encounter,wingAndTailPose};
})();
