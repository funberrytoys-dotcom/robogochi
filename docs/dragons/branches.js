(() => {
  'use strict';

  const missions = {
    1: { action: 'care', reward: 8, title: 'Первое угощение', hint: 'Сорви ягоду рядом с гнездом и коснись дракоши.' },
    2: { action: 'lesson', reward: 12, title: 'Первый трюк', hint: 'Разучи трюк в школе или повтори знакомый.' },
    3: { action: 'game', reward: 16, title: 'Лесная игра', hint: 'Закончи одну мини-игру.' },
    4: { action: 'care', reward: 20, title: 'Тепло кроны', hint: 'Угости или погладь дракона.' },
    5: { action: 'lesson', reward: 24, title: 'Тропа к сердцу', hint: 'Покажи трюк в школе драконов.' },
    6: { action: 'game', reward: 28, title: 'Тайна корней', hint: 'Закончи лесную игру.' }
  };
  const total = Object.keys(missions).length+1;
  const ordinals = ['', 'первую', 'вторую', 'третью', 'четвёртую', 'пятую', 'шестую', 'седьмую'];
  let grove, host, parts, expanded = false, receipt = '';

  function count() {
    return grove?.s?.branches?.open || 1;
  }

  function initialize(game) {
    grove = game;
    const old = grove.s.branches;
    const showcase = ['grove','rigs'].includes(new URLSearchParams(location.search).get('showcase'));
    const residents = grove.s.dragons.length;
    const oldCount = Number.isInteger(old?.open) ? old.open : Math.max(1, residents);
    const open = showcase ? total : Math.max(1, Math.min(total, oldCount));
    const progress = {
      open,
      hatched: Boolean(old?.hatched || residents),
      done: old?.open === open && open < total && old?.done === true
    };
    grove.s.branches = progress;
    if (!old || old.open !== open || old.hatched !== progress.hatched || old.done !== progress.done) grove.save();
    host = document.getElementById('guide');
    if (host && !host.querySelector('.sv-button')) {
      host.innerHTML = '<button type="button" class="sv-button" aria-controls="sv-quest" aria-expanded="false">'+
        '<span class="sv-orbit" aria-hidden="true"><i class="sv-fly"><i class="sv-wing"></i><i class="sv-wing sv-wing-back"></i><i class="sv-body"></i></i></span>'+
        '<span class="sv-copy"><b>Светик</b><span class="sv-hint"></span></span><span class="sv-chevron" aria-hidden="true">⌄</span></button>'+
        '<section id="sv-quest" class="sv-quest" aria-label="Задание Светика" hidden>'+
        '<div class="sv-track" aria-hidden="true">'+'<i></i>'.repeat(total)+'</div>'+
        '<b class="sv-title"></b><p class="sv-detail"></p><button type="button" class="sv-claim" hidden></button></section>'+
        '<span class="sv-sr" role="status"></span>';
      host.querySelector('.sv-button').addEventListener('click', () => setExpanded(!expanded));
      host.querySelector('.sv-claim').addEventListener('click', () => {
        if (openNext()) parts.toggle.focus({preventScroll: true});
      });
    }
    if (host) {
      const find = selector => host.querySelector(selector);
      parts = { toggle: find('.sv-button'), hint: find('.sv-hint'), quest: find('.sv-quest'), title: find('.sv-title'),
        detail: find('.sv-detail'), claim: find('.sv-claim'), status: find('.sv-sr'), steps: host.querySelectorAll('.sv-track i') };
    }
    expanded = false;
    receipt = '';
    refresh();
  }

  // Called by the game only after a successful action, never on merely entering its screen.
  function event(kind) {
    if (!grove) return false;
    const p = grove.s.branches;
    if (kind === 'hatch' && !p.hatched) {
      p.hatched = true;
    } else if (p.hatched && !p.done && missions[p.open]?.action === kind) {
      p.done = true;
    } else {
      return false;
    }
    receipt = '';
    grove.save();
    refresh();
    return true;
  }

  function openNext() {
    if (!grove) return false;
    const p = grove.s.branches;
    const mission = missions[p.open];
    if (!mission || !p.hatched || !p.done) return false;
    p.open++;
    p.done = false;
    grove.s.coins += mission.reward;
    receipt = 'Ветвь открыта! Получено ' + mission.reward + ' пыльцы.';
    grove.save();
    refresh();
    if (parts) parts.status.textContent = receipt;
    window.dispatchEvent(new CustomEvent('grove-branches-changed',{detail:{opened:p.open-1}}));
    return true;
  }

  function setExpanded(value) {
    expanded = value;
    refresh();
  }

  function guide() {
    if (!host) return;
    setExpanded(true);
    parts.toggle.focus({preventScroll: true});
  }

  function refresh() {
    if (!grove || !parts) return;
    const p = grove.s.branches, mission = missions[p.open];
    let hint, title, detail;
    if (!mission) {
      hint = 'Все ветви открыты!';
      title = 'Древо расцвело';
      detail = 'Сканируй QR с игрушки, чтобы поселить здесь ещё одного дракона.';
    } else if (!p.hatched) {
      const warmth = grove.s.eggs[0]?.warmth || 0;
      hint = ['Коснись яйца в гнезде.', 'Согрей яйцо ещё раз.', 'Пора помочь малышу вылупиться!'][Math.min(2, warmth)];
      title = 'Первая встреча';
      detail = 'Коснись яйца трижды. Когда малыш вылупится, угости его, и мы разгоним туман над цветущей ветвью.';
    } else if (!p.done) {
      hint = mission.hint;
      title = mission.title;
      detail = 'Развеем туман над новой ветвью. Тебе достанется ' + mission.reward + ' пыльцы.';
    } else {
      hint = 'Можно открыть ' + ordinals[p.open + 1] + ' ветвь!';
      title = 'Задание выполнено';
      detail = 'Я принёс тебе ' + mission.reward + ' пыльцы. Заберём?';
    }
    parts.hint.textContent = hint;
    parts.title.textContent = title;
    parts.detail.textContent = receipt ? receipt + ' ' + detail : detail;
    parts.toggle.setAttribute('aria-expanded', String(expanded));
    parts.toggle.setAttribute('aria-label', 'Светик. ' + hint + (expanded ? ' Свернуть подсказку' : ' Открыть подсказку'));
    parts.quest.hidden = !expanded;
    parts.claim.hidden = !(mission && p.done && p.hatched);
    if (!parts.claim.hidden) parts.claim.textContent = 'Открыть ' + ordinals[p.open + 1] + ' ветвь';
    host.classList.toggle('sv-ready', !parts.claim.hidden);
    parts.steps.forEach((step,i) => step.classList.toggle('sv-lit', i < p.open));
  }

  document.addEventListener('keydown', e => {
    if (expanded && e.key === 'Escape' && host?.contains(document.activeElement)) {
      e.stopPropagation();
      setExpanded(false);
      parts.toggle.focus({preventScroll: true});
    }
  });
  document.addEventListener('pointerdown', e => {
    if (expanded && !host?.contains(e.target)) setExpanded(false);
  }, true);
  window.Branches = {initialize, count, event, openNext, refresh, guide};
})();
