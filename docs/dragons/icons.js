/* Small hand-illustrated inventory objects for Dragon Tree. The public glyph(key)
   function returns standalone inline SVG, including its own paint gradients. */
(() => {
  "use strict";

  const ink = "#443934";
  const colors = {
    leaf: ["#e5f38a", "#80c76b", "#348969"],
    teal: ["#c3fbce", "#71d6b1", "#35999c"],
    gold: ["#fff3ad", "#ffc65a", "#d58a37"],
    amber: ["#ffe5a3", "#edac57", "#bf763d"],
    paper: ["#fffbd5", "#ffe9ae", "#e4bd78"],
    wood: ["#e5b977", "#ba825b", "#855953"],
    plum: ["#cca4df", "#a278bf", "#785b9d"],
    blue: ["#c6f1fa", "#85ccdf", "#568eb5"],
    rose: ["#ffd4be", "#f18c89", "#ca6472"],
    coral: ["#ffcb9d", "#f5a06c", "#d97b6e"],
    berry: ["#ffb9ac", "#eb747b", "#b34d73"],
    sky: ["#b9feea", "#68d9dc", "#4c9ac2"],
  };
  const outline = (d, fill, stroke = ink, width = 2.1) =>
    '<path d="' + d + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '"/>';
  const line = (d, stroke, width = 1.7) => outline(d, "none", stroke, width);
  const spot = (x, y, r, fill) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '"/>';
  const glint = (x, y, r, fill = "#fff4bd") =>
    '<path transform="translate(' + x + ' ' + y + ') scale(' + r + ')" fill="' + fill + '" d="M0-1 Q.12-.16 1 0 Q.15.12 0 1 Q-.12.14-1 0 Q-.15-.14 0-1Z"/>';
  const qrBlock = (x,y) =>
    '<rect x="' + x + '" y="' + y + '" width="9" height="9" rx="1.2" fill="#3e645f"/>' +
    '<rect x="' + (x+2) + '" y="' + (y+2) + '" width="5" height="5" rx=".55" fill="#fff2c1"/>' +
    '<rect x="' + (x+3.4) + '" y="' + (y+3.4) + '" width="2.2" height="2.2" fill="#3e645f"/>';

  const speaker = outline("M7 20Q7 18 10 18L16 17 26 9Q28 7 29 10L30 38Q30 41 27 39L16 31 10 31Q7 31 7 28Z","@gold") +
    outline("M8 20 16 19 17 30 9 29Z","@teal",ink,1.5) +
    line("M24 14 26 12 27 34","#fff3b6",1.5);
  const illustrations = {
    // An open field guide, with a violet cover and a cloth bookmark.
    book: outline("M4 11Q13 7 24 14Q35 7 44 10L45 35Q36 34 25 41Q14 35 4 37Z","@plum") +
      outline("M5 9Q14 6 24 12Q34 6 43 8L42 32Q33 31 24 37Q15 31 5 32Z","@paper") +
      outline("M25 13Q34 8 41 9L40 29Q33 28 25 34Z","#f8d59b","none") +
      line("M24 13Q25 23 24 36","#a78061",1.7) +
      line("M9 17Q15 16 20 20M9 22Q15 21 20 25","#bb996c",1.65) +
      outline("M30 10 35 8 35 23 32 20 30 23Z","@teal","#658d80",1.3) +
      line("M7 34Q15 33 21 37","#e6b1e1",1.1),
    // Leaf-winged wooden gamepad. The cross and jewel buttons read at thumbnail size.
    games: outline("M23 13Q18 6 24 3Q28 5 27 12Q31 5 37 7Q38 12 29 15Z","@leaf") +
      outline("M8 16Q12 11 18 13Q23 16 29 13Q35 10 40 17Q43 22 45 32Q47 42 39 40Q35 39 30 33L18 33Q13 39 9 40Q2 42 3 34Q4 22 8 16Z","@teal") +
      line("M9 18Q13 14 17 16M31 16Q36 14 39 20","#d6ffe1",2) +
      outline("M12 20H16V24H20V28H16V32H12V28H8V24H12Z","#546475","#3b5059",1.35) +
      spot(33,23,3.15,"#a76c72") + spot(33,22.2,2.45,"#ffc089") +
      spot(38,28.5,3.05,"#986771") + spot(38,27.7,2.35,"#f1939d") +
      line("M23 28 26 28","#428c86",2),
    // Two trading cards and the egg of the collected dragon.
    collection: outline("M7 8 29 4Q31 4 32 7L37 35 13 40Q11 40 10 37L5 11Q4 9 7 8Z","@plum") +
      outline("M16 7 40 10Q42 10 42 13L38 42Q38 44 35 44L12 41Q10 41 11 38L14 10Q14 7 16 7Z","@gold") +
      outline("M18 12 37 14 34 37 15 35Z","#708f8b","#826b50",1.5) +
      outline("M27 16C24 16 19 23 19 27C19 31 22 33 26 33C31 33 33 30 32 26C31 21 29 17 27 16Z","@blue","#496d80",1.65) +
      outline("M23 22Q26 23 24 26Q22 28 21 26Q20 24 23 22Z","#d9f7e8","none") +
      spot(28.5,28.5,1.65,"#7ba5cc") + glint(34.3,16.4,2.6),
    // A small timber stall with a real canopy, two posts and a fruit counter.
    shop: outline("M9 20 38 20 38 39 8 39Z","@wood") +
      outline("M13 21H34V33H13Z","#6d625c","none") +
      outline("M4 34Q3 32 6 32L40 32Q43 32 43 35L40 40 8 41Z","@gold") +
      outline("M8 6Q8 5 11 5L36 6Q38 6 38 8L44 19Q43 24 39 24Q35 24 33 20Q30 25 26 24Q23 24 21 21Q18 26 14 24Q12 23 11 21Q8 25 4 22Q2 21 3 18Z","@coral") +
      outline("M14 7 20 7 18 19Q17 23 14 23Q11 23 11 19Z","@paper","#ad7862",1.05) +
      outline("M26 7 32 7 34 19Q33 23 30 23Q27 23 26 20Z","@paper","#ad7862",1.05) +
      line("M9 8 36 9","#ffe8b5",1.45) +
      spot(18,30,3,"#d97b83") + spot(23,29.3,3.15,"#a8cf7a") + spot(29,30,2.85,"#fac477"),
    qr: outline("M7 7Q7 5 10 5L31 5 41 15 41 39Q41 42 38 42H10Q7 42 7 39Z","@teal") +
      outline("M10 9 30 9 37 16 37 38 10 38Z","@paper","#61796a",1.4) +
      '<g>' + qrBlock(13,13)+qrBlock(25,13)+qrBlock(13,25) +
      outline("M25 25H29V29H33V26H35V33H30V35H26V31H25Z","#3e645f","none") + '</g>' +
      outline("M30 7 38 15 31 15Z","#b6ecd1","#587e74",1.1),
    overview: outline("M3 12 16 7 30 12 44 7 43 36 30 41 16 36 4 41Z","@paper") +
      outline("M16 9 29 13 29 38 16 34Z","#e7c889","none") +
      line("M16 9 16 35M30 13 30 38","#af895d",1.3) +
      line("M7 31Q11 24 18 27Q22 28 26 23","#b47976",1.9) +
      spot(8,30,1.8,"#a96867") +
      outline("M27 20Q23 16 27 12Q32 7 36 12Q39 16 35 20L31 26Z","@berry","#8c5b61",1.5) +
      spot(31,15,2.1,"#ffe2a8"),
    sprout: outline("M21 42Q20 33 23 24Q11 29 4 16Q1 10 4 9Q19 7 24 20Q24 8 36 5Q44 2 45 5Q45 20 29 26Q25 30 25 41Z","@leaf") +
      line("M8 13Q17 15 23 24M29 20Q33 12 40 8","#568763",1.9) +
      line("M7 11Q12 10 16 13M32 11Q35 8 39 7","#f0f3a3",1.45),
    pollen: outline("M24 3Q25 2 26 5L31 15 42 20Q46 22 44 24L32 30 26 43Q25 46 23 43L17 32 5 26Q2 24 5 22L17 16Z","@gold","#805e3f",2.1) +
      outline("M24 6 25 21 18 16Z","#fff9ce","none") +
      outline("M25 21 40 22 31 27 25 39Z","#e5a347","none") +
      outline("M25 13 29 21 35 24 28 27 24 34 21 27 14 24 21 21Z","#fff2a3","#edbc62",1.1) +
      glint(37.5,7,3.3,"#fff8ce"),
    sound: speaker+line("M34 17Q40 24 35 31","#ffe9ad",3.45)+line("M39 11Q48 24 41 37","#ffe3a0",2.8),
    mute: speaker+line("M36 19 44 29M44 19 36 29","#7e554d",5)+line("M36 18.7 44 28.7M44 18.7 36 28.7","#ffd3ab",2.7),
    egg: outline("M24 4C17 4 6 22 6 32C6 40 14 45 24 45C35 45 42 39 42 31C42 22 31 4 24 4Z","@teal") +
      outline("M8 28Q13 30 17 24Q23 30 28 24Q33 28 39 25Q44 36 34 41Q16 50 8 36Z","@paper","#549c80",1.5) +
      spot(15,33,2.8,"#f0a668")+spot(32,34,2.2,"#e7a17f")+line("M15 19Q17 14 20 12","#dbffe0",2.5),
    heart: outline("M24 42C17 38 4 29 4 17C4 7 17 3 24 13C30 3 44 7 44 17C44 27 32 38 24 42Z","@berry","#844d61",2.1) +
      line("M9 17Q9 11 15 11","#ffe2c8",3)+line("M27 37Q35 32 39 26","#c35972",1.9),
    berry: outline("M24 18Q14 17 11 6Q20 4 25 12Q28 3 39 4Q38 16 26 18Z","@leaf","#4c7054") +
      outline("M23 17Q29 16 32 21Q40 16 44 26Q47 37 37 41Q28 45 24 38Z","@berry","#734659") +
      outline("M11 16Q17 12 24 17Q32 22 28 32Q25 42 16 41Q6 40 4 30Q2 22 11 16Z","@berry","#734659") +
      line("M10 23Q12 19 16 19M34 24Q36 22 38 23","#ffcfbc",2.6) +
      line("M22 17Q26 13 30 11","#537159",1.8),
    moon: outline("M29 4Q13 14 21 28Q27 38 41 31Q35 44 22 43Q6 42 5 27Q3 10 19 5Q25 3 29 4Z","@gold","#a57647",2.1) +
      line("M10 21Q11 14 17 10","#fff6bb",2.1) + glint(36,13,6.1,"#ffdf83") + glint(43,23,2.9),
    drop: outline("M24 3C21 13 7 24 7 32C7 40 14 45 24 45C34 45 41 39 41 31C41 22 28 11 24 3Z","@sky","#427c89",2.1) +
      line("M12 30Q12 25 18 20","#e6fff2",2.9)+line("M25 40Q31 40 35 35","#5babc0",2),
    hand: outline("M13 27 10 14Q10 10 13 10Q15 10 16 13L18 24 16 8Q16 4 19 4Q22 4 22 8L23 22 24 7Q24 4 27 4Q30 5 29 9L29 23 31 12Q32 9 35 10Q37 11 36 15L35 29Q41 23 44 25Q46 27 43 31L37 39Q33 44 25 44Q17 44 13 39L5 29Q2 25 5 23Q7 22 10 25Z","@amber","#8d6250",2) +
      line("M14 36Q17 40 22 40M12 15 14 22","#ffe9b1",1.8) +
      glint(39,7,3.4,"#ffe4a0"),
    spark: outline("M24 3Q27 18 32 20L45 24Q29 28 27 33L24 45Q20 28 16 27L3 24Q19 19 21 15Z","@gold","#ab7943",1.9) +
      outline("M24 10 25 23 36 24 25 26 24 36 21 26 13 24 22 22Z","#fff4b4","none"),
    sun: outline("M21 7 24 2 27 8 33 5 34 12 41 12 39 19 46 23 40 27 42 34 35 35 34 42 27 39 23 46 19 39 12 42 11 35 4 33 7 27 2 23 8 19 6 12 13 12 15 5Z","@gold","#a57847",1.8) +
      '<circle cx="24" cy="24" r="11" fill="@amber" stroke="#cd984f" stroke-width="1.6"/>'+line("M17 21Q19 16 23 16","#ffeaa6",2),
    leaf: outline("M5 36Q4 18 18 10Q28 5 43 5Q43 21 33 31Q24 40 10 37L6 43 3 41Z","@leaf","#4c785e",2.1) +
      line("M8 36Q18 24 34 13M18 26 18 17M23 22 31 22","#5c9166",1.9) +
      line("M12 24Q16 14 25 11","#e3efa0",1.7),
    lamp: line("M18 10Q17 2 24 2Q31 2 30 10","#fae4a4",2.7) +
      outline("M11 17 15 37Q24 44 33 37L37 17Z","@gold","#6d6554",2) +
      outline("M10 17 15 11 20 9 30 9 38 16 37 19 11 19Z","@teal","#5c6d60",1.7) +
      outline("M23 35Q15 33 21 26L25 21Q25 26 28 28Q31 34 23 35Z","#fff4bd","none") +
      outline("M15 36Q24 40 33 36L32 40 24 43 16 40Z","@wood","#665849",1.6),
    flower: outline("M23 17C12 7 18 0 24 5Q29 8 28 16C33 4 44 8 41 16Q40 20 32 22C46 23 46 35 37 35Q31 36 28 30C32 42 23 48 18 40Q16 35 20 29C9 40 1 32 8 25Q11 22 17 22C5 20 4 10 12 10Q18 10 23 17Z","@rose","#986d6c",1.85) +
      '<circle cx="24" cy="24" r="6.3" fill="@gold" stroke="#bc8658" stroke-width="1.4"/>'+spot(22.5,22.5,1.7,"#fff3b1"),
    camera: outline("M5 15H12L16 8H29L33 14H41Q44 14 44 18V36Q44 40 40 40H7Q4 40 4 37Z","@teal") +
      '<circle cx="25" cy="26" r="9" fill="@gold" stroke="#526b68" stroke-width="2"/><circle cx="25" cy="26" r="5.6" fill="@blue" stroke="#526b68" stroke-width="1.3"/>' +
      spot(23.5,24.8,1.6,"#e6fff2")+spot(37,19,1.7,"#fff4ae"),
    close: line("M12 12 36 36M36 12 12 36","#8e6d58",7.2) + line("M12 11 36 35M36 11 12 35","#ffe6b1",4.2),
    arrow: outline("M15 7 35 23Q36 24 34 26L15 42 10 35 24 24 10 14Z","@gold","#947049",2),
    check: outline("M4 24 11 18 19 27 36 8 43 14 21 40Q19 42 17 40Z","@leaf","#527559",2),
  };
  let instance = 0;
  function glyph(key) {
    const id = 'grove-paint-' + (++instance) + '-';
    const paints = new Set();
    const content = (illustrations[key] || illustrations.spark).replace(/@(\w+)/g, (_, name) => {
      paints.add(name);
      return 'url(#' + id + name + ')';
    });
    const defs = [...paints].map(name => {
      const [light, middle, dark] = colors[name];
      return '<linearGradient id="' + id + name + '" x1="18%" y1="0%" x2="80%" y2="100%"><stop stop-color="' + light + '"/><stop offset=".52" stop-color="' + middle + '"/><stop offset="1" stop-color="' + dark + '"/></linearGradient>';
    }).join('');
    return '<svg class="grove-illustration" viewBox="0 0 48 48" aria-hidden="true" focusable="false" stroke-linecap="round" stroke-linejoin="round"><defs>' + defs + '</defs>' + content + '</svg>';
  }
  const sizing = document.createElement('style');
  sizing.textContent = [
    '.nav-btn i .grove-illustration{width:86%;height:86%;max-width:38px;max-height:38px;filter:drop-shadow(0 1px 1px #382d4060)}',
    '.care-actions .act .grove-illustration{width:21px;height:21px;max-height:58%}',
    '.top-tools .circle:has(.grove-illustration){padding:3px}.top-tools .circle .grove-illustration{width:100%;height:100%;max-width:27px;max-height:27px}',
    '.grove-illustration{display:inline-block;vertical-align:middle;flex-shrink:0}',
    '@media(max-height:520px){.care-actions .act .grove-illustration{width:16px;height:16px}}'
  ].join('');
  document.head.append(sizing);
  window.glyph = glyph;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = glyph(el.dataset.icon); });
})();
