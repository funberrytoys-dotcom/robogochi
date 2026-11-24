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
  return {duration,ease,pose};
})();
