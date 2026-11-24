/* Dragon in the Leaves with soft acoustic cues and a two-voice effect limit. */
(() => {
  "use strict";

  const file = name => groveAsset("assets/audio-soft/" + name + ".mp3");
  const preferenceKey = "toysberry.dragon-tree.sound.v1";
  const names = new Set([
    "egg", "hatch", "pet", "feed", "sleep", "win", "school", "click",
    "evolve", "coin", "note0", "note1", "note2", "note3", "fail"
  ]);
  const highPriority = new Set(["hatch", "evolve", "win"]);
  const lastStart = new Map();
  const playing = new Set();
  const limits = { click: 180, pet: 420, egg: 220, feed: 350, school: 300 };
  const music = new Audio();
  music.src = file("dragon-in-the-leaves");
  music.loop = true;
  music.volume = 0.30;
  music.preload = "none";
  let audible = true;
  let activated = false;

  try { audible = localStorage.getItem(preferenceKey) !== "off"; } catch {}

  function start() {
    activated = true;
    if (audible && !document.hidden && music.paused) music.play().catch(() => {});
    return audible;
  }

  function quiet() {
    music.pause();
    for (const voice of playing) voice.pause();
    playing.clear();
  }

  function toggle() {
    audible = !audible;
    try { localStorage.setItem(preferenceKey, audible ? "on" : "off"); } catch {}
    if (audible) start(); else quiet();
    return audible;
  }

  // Curve each effect in the recorded files, then keep at most two
  // interactive sounds running. Repeated fast taps cannot build up a chord.
  function play(name) {
    if (!audible || document.hidden || !names.has(name)) return;
    if (!activated) start();
    const now = performance.now();
    if (now - (lastStart.get(name) ?? -Infinity) < (limits[name] ?? 110)) return;
    if (playing.size >= 2) {
      if (!highPriority.has(name)) return;
      const oldest = playing.values().next().value;
      oldest.pause();
      playing.delete(oldest);
    }
    const voice = new Audio(file(name));
    voice.volume = name.startsWith("note") ? 0.67 : 0.58;
    const finish = () => playing.delete(voice);
    voice.addEventListener("ended", finish, { once: true });
    voice.addEventListener("error", finish, { once: true });
    playing.add(voice);
    lastStart.set(name, now);
    voice.play().catch(finish);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) quiet(); else if (activated) start();
  });
  document.addEventListener("pointerup", start, { once: true, passive: true });
  document.addEventListener("keydown", start, { once: true });
  window.DragonAudio = Object.freeze({ start, toggle, enabled: () => audible, play });
})();
