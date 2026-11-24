/* Offline sound for the dragon tree. Load this script before the game. */
(() => {
  "use strict";

  const file = name => groveAsset("assets/audio/" + name + ".mp3");
  const preferenceKey = "toysberry.dragon-tree.sound.v1";
  const effects = {
    egg: 0.8, hatch: 0.85, pet: 0.8, feed: 0.72, sleep: 0.66,
    win: 0.74, school: 0.7, click: 0.53, evolve: 0.81, coin: 0.62,
    note0: 0.76, note1: 0.76, note2: 0.76, note3: 0.76, fail: 0.63,
  };
  const voices = new Map();
  const music = new Audio();
  music.src = file("tree-canopy");
  music.loop = true;
  music.volume = 0.36;
  music.preload = "none";
  let audible = true;
  let activated = false;

  try { audible = localStorage.getItem(preferenceKey) !== "off"; } catch {}

  function resumeMusic() {
    if (!activated || !audible || document.hidden || !music.paused) return;
    music.play().catch(() => {}); // Browsers require a gesture after autoplay is blocked.
  }

  function start() {
    activated = true;
    resumeMusic();
    return audible;
  }

  function toggle() {
    audible = !audible;
    try { localStorage.setItem(preferenceKey, audible ? "on" : "off"); } catch {}
    if (audible) start();
    else {
      music.pause();
      voices.forEach(pool => pool.forEach(voice => voice.pause()));
    }
    return audible;
  }

  function play(name) {
    if (!audible || document.hidden || !Object.hasOwn(effects, name)) return;
    if (!activated) start();
    let pool = voices.get(name);
    if (!pool) {
      pool = [];
      voices.set(name, pool);
    }
    let voice = pool.find(item => item.ended || item.paused);
    if (!voice && pool.length === 3) voice = pool.shift();
    if (!voice || !pool.includes(voice)) {
      if (!voice) {
        voice = new Audio(file(name));
        voice.volume = effects[name];
      }
      pool.push(voice);
    }
    voice.currentTime = 0;
    voice.play().catch(() => {});
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      music.pause();
      voices.forEach(pool => pool.forEach(voice => voice.pause()));
    } else resumeMusic();
  });
  // Retry after a real gesture if start() was first requested during page load.
  document.addEventListener("pointerup", start, { once: true, passive: true });
  document.addEventListener("keydown", start, { once: true });
  window.DragonAudio = Object.freeze({ start, toggle, enabled: () => audible, play });
})();
