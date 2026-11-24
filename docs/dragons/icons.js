(() => {
  const shapes = {
    sprout:'<path d="M12 21v-8M12 16C4 16 3 11 3 7c5 0 9 2 9 7m0-3c0-6 4-9 9-9 0 5-2 10-9 11"/>',
    pollen:'<path d="m12 2 2.8 6.7L21 12l-6.2 3.3L12 22l-2.8-6.7L3 12l6.2-3.3Z"/><path d="m12 7 1.3 3.5L16 12l-2.7 1.5L12 17l-1.3-3.5L8 12l2.7-1.5Z"/>',
    sound:'<path d="M3 9h4l5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute:'<path d="M3 9h4l5-4v14l-5-4H3zM16 9l6 6m0-6-6 6"/>',
    book:'<path d="M12 6C8 3 5 3 2.5 4.5v14C6 17 9 17.5 12 20c3-2.5 6-3 9.5-1.5v-14C19 3 16 3 12 6Zm0 0v14"/><path d="m5 8 4 1m-4 2 4 1m6-3 4-1"/>',
    games:'<path d="m10 10 3-7 2 6 6 3-7 2-3 7-2-6-6-3Z"/><path d="m4 3 .7 1.7L6.5 5l-1.8.7L4 7.5l-.7-1.8L1.5 5l1.8-.3ZM19 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>',
    shop:'<path d="m3 9 2-6h14l2 6c0 3-3 4-4.5 1.5C15 13 13 13 12 10.5 11 13 8.5 13 7.5 10.5 6 13 3 12 3 9Z"/><path d="M5 12v8h14v-8m-9 8v-5h4v5"/>',
    collection:'<path d="M5 3h13a1 1 0 0 1 1 1v17H6c-2 0-3-2-2-3V5a2 2 0 0 1 1-2ZM4 18h15"/><path d="M12 6c-2 0-4 4-4 6s2 3 4 3 4-1 4-3-2-6-4-6Z"/>',
    qr:'<path d="M3 3h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm11-2h3v3h4v5h-3m-4 0v-4m6-5h1"/>',
    egg:'<path d="M12 2c-3 0-8 8-8 13 0 4 3.5 7 8 7s8-3 8-7c0-5-5-13-8-13Z"/><path d="m7 13 3-1 2 2 3-3 2 1"/>',
    heart:'<path d="M12 20S2.5 14 2.5 8.5C2.5 3 9 2 12 7c3-5 9.5-4 9.5 1.5C21.5 14 12 20 12 20Z"/>',
    berry:'<circle cx="9" cy="14" r="5"/><circle cx="15.5" cy="15.5" r="4.5"/><path d="M11 10c-1-5 3-7 7-7-1 4-3 6-7 7Zm0-1C8 8 6 6 6 4c3 0 5 2 5 5"/>',
    moon:'<path d="M20 14A9 9 0 0 1 10 3 9.3 9.3 0 1 0 21 14Z"/><path d="m18 2 .8 2.1L21 5l-2.2.8L18 8l-.8-2.2L15 5l2.2-.9Z"/>',
    drop:'<path d="M12 2c-1 4-7 9-7 14a7 7 0 0 0 14 0c0-5-6-10-7-14Z"/><path d="M8 15c0 2 1 4 3 4"/>',
    hand:'<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v6c0 4-2 7-7 7-3 0-5-2-7-5l-3-5c-1-2 1-3 3-1Z"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>', arrow:'<path d="m9 5 7 7-7 7"/>',
    check:'<path d="m4 12 5 5L20 6"/>', spark:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    camera:'<path d="M3 7h5l2-3h5l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/>',
    leaf:'<path d="M4 20C3 10 7 3 21 3c0 13-7 17-14 15m-3 3L16 9"/>',
    lamp:'<path d="M9 5a3 3 0 0 1 6 0M6 7h12l-2 12H8Zm0 0 3-2h6l3 2M9 21h6"/><path d="M12 10c-3 3-2 5 0 5 2 0 2-2 0-5Z"/>',
    flower:'<path d="M10 9c-5-7 3-11 4-3 6-5 10 2 3 5 8 2 4 9-2 6-1 8-8 7-7 0-7 2-9-5-2-7Z"/><circle cx="12" cy="12" r="2"/>'
  };
  window.glyph = (key) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+(shapes[key]||shapes.spark)+'</svg>';
  document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=glyph(el.dataset.icon));
})();
