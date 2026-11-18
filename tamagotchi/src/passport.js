'use strict';

const Passport = {
  stamps: [
    ['feeds', 1, 'Угощение', 'Дай роботу печеньку.', 'food'],
    ['speechLearned', 1, 'Первый звук', 'Загляни в «Речь» и научи друга гласной.', 'speech'],
    ['lettersDelivered', 1, 'Почтальон', 'Доставь письмо в «Почтовом экспрессе».', 'rail'],
    ['flowersGrown', 1, 'Садовник', 'Вырасти цветок в «Лунной теплице».', 'bloom'],
    ['washes', 2, 'Чистюля', 'Дважды вымой робота губкой.', 'wash'],
    ['melodies', 3, 'Музыкант', 'Трижды повтори мелодию в «Пи-пи-повтори».', 'dance'],
  ],
  render(body) {
    const s = Game.s, voice = SpeechLab.profile();
    const target = 10 + s.level * 6;
    const count = ([key, goal]) => Math.min(s.stats[key] || 0, goal);
    const missing = this.stamps.find(stamp => count(stamp) < stamp[1]);
    body.innerHTML = `<div class="pass-id"><canvas width="164" height="164" aria-hidden="true"></canvas><div><h3></h3><p>Дружба · уровень ${s.level}</p><progress max="${target}" value="${s.xp}" aria-label="Опыт дружбы"></progress><p>${s.xp} из ${target} опыта</p></div></div>
      <p class="pass-goal">${voice.stage}. Выучено карточек: ${voice.learned} из ${voice.total}.</p>
      <div class="pass-collection">${this.stamps.map(stamp => {
        const [,goal,name,,icon] = stamp, value = count(stamp), won = value === goal;
        return `<div class="pass-stamp ${won ? 'won' : ''}" title="${stamp[3]}">${ICON[icon]}<b>${name}</b><small>${won ? 'Марка твоя' : value + ' / ' + goal}</small></div>`;
      }).join('')}</div>
      <p class="pass-goal">${missing ? 'Следующая марка. ' + missing[3] : 'В коллекции все шесть марок!'}</p>
      <div class="pass-actions"><button data-go="speech">Урок речи</button><button data-go="parcel">Вспомнить посылку</button></div>`;
    body.querySelector('h3').textContent = s.name;
    const g = body.querySelector('canvas').getContext('2d');
    g.scale(2, 2); drawPreviewRobot(g, Game.def, 82, 82, s.hat, true);
    body.querySelector('[data-go="speech"]').onclick = () => SpeechLab.open();
    body.querySelector('[data-go="parcel"]').onclick = () => { UI.closeSheet(); Game.setScene(Parcel, {replay:true}); };
  },
};
