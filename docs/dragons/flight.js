(() => {
  'use strict';
  const seats = GroveCamera.mounts;
  const forms = ['baby', 'teen', 'adult'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let world, habitat, overlay, active, timer, raf, turn = 0, ready = false;
  const canFly = () => ready && !document.hidden && !reduced.matches && overlay.hidden && !habitat.parentElement.dataset.dragonGrip && Branches.count() > 1;
  const limit = (value, low, high) => Math.min(high, Math.max(low, value));

  function schedule(ms) {
    clearTimeout(timer);
    if (canFly()) timer = setTimeout(depart, ms);
  }

  function finish() {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    if (!active) return;
    const {button, cel} = active;
    button.classList.remove('flight-moving', 'flight-over', 'flight-right');
    button.style.removeProperty('--flight-x');
    button.style.removeProperty('--flight-y');
    cel.remove();
    active = null;
  }

  function journey(a, b, t, lift) {
    const u = (1 - Math.cos(Math.PI * t)) * .5;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(Math.PI * t) * lift];
  }

  function clearPath(a, b, lift, size, stage) {
    const rect = world.getBoundingClientRect();
    const obscured = window.GroveDepth?.wildlifeMask(world);
    const artWidth = size * 1.16;
    const artHeight = artWidth * rect.width / rect.height * [.8, .65, 1.01][stage];
    for (let i = 0; i <= 36; i++) {
      const [x,y] = journey(a,b,i/36,lift);
      if (x - artWidth/2 < 0 || x + artWidth/2 > 100) return false;
      if (!obscured) continue;
      for (let col = 0; col < 7; col++) for (let row = 0; row < 6; row++) {
        const sx = x + (col/6 - .5) * artWidth;
        const sy = y + (.12 - row/5) * artHeight;
        if (obscured(sx*rect.width/100, sy*rect.height/100)) return false;
      }
    }
    return true;
  }

  function chooseRoute(button, d, isHero) {
    if(button.hasAttribute('data-island-home'))return;
    const count = Branches.count(), w = world.getBoundingClientRect(), visible = habitat.getBoundingClientRect();
    const bs = button.getBoundingClientRect();
    const from = [(bs.left + bs.width/2 - w.left)*100/w.width, (bs.bottom-w.top)*100/w.height];
    if (bs.bottom < visible.top+42 || bs.top > visible.bottom-20 || bs.right < visible.left || bs.left > visible.right) return;
    if (Number.isInteger(d.bough) && (d.bough < 0 || d.bough >= count)) return;
    const nearest = seats.slice(0,count).reduce((a,p,i) => Math.abs(p[1]-from[1]) < Math.abs(seats[a][1]-from[1]) ? i : a, 0);
    const size = bs.width / w.width * 100;
    const targets = seats.slice(0,count).map(([x,y],i) => ({i, pos:[x + (x<50 ? 8 : -8), y]}))
      .filter(target => target.i !== nearest).sort((a,b) => Math.abs(a.i-nearest) - Math.abs(b.i-nearest));
    // An occupied neighbour offers a short visit to an adjacent spot, then a return home.
    // When fog splits two open seats, prefer a shorter hop on the same uncovered bough.
    targets.push({pos:[limit(from[0]+(from[0]<50?7:-7),size*.7,100-size*.7),from[1]]});
    for (const {pos} of targets) {
      for (const lift of [6.8, 3.5]) {
        if (clearPath(from,pos,lift,size,d.stage)) return {button, d, from, to:pos, lift, isHero, view:habitat.dataset.view};
      }
    }
  }

  function depart() {
    if (!canFly() || active) return;
    const perched = [...document.querySelectorAll('#residents button[data-friend]')];
    const friends = new Map(Grove.s.dragons.map(d=>[d.id,d]));
    const flyers = perched.map(button=>({button, d:friends.get(button.dataset.friend), isHero:false})).filter(x=>x.d && !x.d.sleeping);
    if (!flyers.length && !perched.length) {
      const hero = document.getElementById('hero'), d = Grove.current();
      if (d && !d.sleeping && hero) flyers.push({button:hero, d, isHero:true});
    }
    for (let i=0; i<flyers.length; i++) {
      const {button,d,isHero} = flyers[(turn+i)%flyers.length];
      if (button.matches(':focus-visible, :active')) continue;
      const route = chooseRoute(button,d,isHero);
      if (!route) continue;
      const rig=d.species>=6;
      const cel = rig?document.createElement('canvas'):new Image();
      if(rig){cel.width=480;cel.height=320;}else cel.alt='';
      cel.className = 'flight-cel';
      cel.setAttribute('aria-hidden','true');
      const url = 'assets/flight/' + forms[d.stage] + '-' + d.species + '.webp';
      active = {...route, cel, rig:rig?cel.getContext('2d'):null, start:0, count:Branches.count(), phase:''};
      const trip = active;
      const launch = () => {
        if (active !== trip) return;
        if (!canFly() || !button.isConnected || !document.getElementById('hero')) { restart(); return; }
        button.append(cel);
        button.classList.add('flight-moving');
        trip.start = performance.now();
        tick(trip.start);
      };
      cel.onerror = () => { if (active === trip) { finish(); schedule(4000); } };
      if(rig)launch();else {cel.onload=launch;cel.src=groveAsset(url);}
      turn += i + 1;
      return;
    }
    schedule(2800);
  }

  function tick(now) {
    const flight = active;
    if (!flight) return;
    const {button, cel, from, to, d, isHero} = flight;
    if (!canFly() || !button.isConnected || flight.count !== Branches.count() || flight.view !== habitat.dataset.view ||
        d.sleeping || (isHero && Grove.current()?.id !== d.id)) { restart(); return; }
    const dt = now - flight.start, travel = 2300, pause = 850;
    if (dt >= travel*2 + pause) { finish(); schedule(2600 + Math.random()*3000); return; }
    const leg = dt<travel ? 'out' : dt<travel+pause ? 'land' : 'back';
    if (leg !== flight.phase) {
      flight.phase = leg;
      button.classList.toggle('flight-over', leg !== 'land');
      button.classList.toggle('flight-right', leg === 'out' ? to[0] > from[0] : leg==='back' && from[0]>to[0]);
      if (leg==='land') cel.remove();  // no hidden airborne animation while sitting on the branch
      else if (!cel.isConnected) button.append(cel);
    }
    const xy = leg==='out' ? journey(from,to,dt/travel,flight.lift) : leg==='land' ? to :
      journey(to,from,(dt-travel-pause)/travel,flight.lift);
    if(flight.rig && leg!=='land'){
      const elapsed=leg==='out'?dt:dt-travel-pause;
      const pose=elapsed<300?'takeoff':elapsed>travel-420?'land':'fly';
      DragonStage.draw(flight.rig,d,pose,elapsed/1000,{amount:pose==='land'?Math.max(0,(travel-elapsed)/420):1});
    }
    button.style.setProperty('--flight-x',xy[0].toFixed(3)+'%');
    button.style.setProperty('--flight-y',xy[1].toFixed(3)+'%');
    raf = requestAnimationFrame(tick);
  }

  function restart() { finish(); schedule(650); }

  function start() {
    if (ready) return;
    world = document.getElementById('world'); habitat = document.getElementById('habitat'); overlay = document.getElementById('overlay');
    if (!world || !habitat || !overlay || !window.Branches || !window.Grove) return;
    ready = true;
    reduced.addEventListener('change',restart);
    document.addEventListener('visibilitychange',restart);
    window.addEventListener('resize',restart);
    window.addEventListener('grove-branches-changed',restart);
    new MutationObserver(restart).observe(overlay,{attributes:true,attributeFilter:['hidden']});
    new MutationObserver(restart).observe(document.querySelector('#game'),{attributes:true,attributeFilter:['data-dragon-grip']});
    new MutationObserver(() => { if (active && !active.button.isConnected || !active && canFly()) restart(); })
      .observe(document.getElementById('residents'),{childList:true});
    // Keep normal delegated click/keyboard handlers on the original moving button.
    world.addEventListener('click',e=>{
      if (active && active.button.contains(e.target)) { finish(); schedule(4500); }
    });
    schedule(650);
  }

  window.GroveFlight = {start,quietHero(){if(active?.isHero){finish();schedule(5800);}}};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
