import { engine } from './engine.js';
import { modal, h, on, thumb, centerMsg } from './ui.js';
import { save, persist, resetSave } from './save.js';
import { SPECIES, SPECIES_BY_ID, DECOR, WORLDS } from './data.js';
import { ECONOMY, PRIVACY_POLICY_URL } from './config.js';
import { sfx, setMusic } from './audio.js';
import { showRewarded } from './ads.js';

const FREE_EGG_COOLDOWN = 5 * 60 * 1000;

// ---------------- SHOP ----------------
export function openShop({ onBuyDecor, onChange, tab = 'eggs' } = {}) {
  const body = h('<div></div>');
  const m = modal({ title: '🛍️ Shop', color: 'var(--orange)', body, onClose: onChange });

  function render() {
    const freeReady = Date.now() - (save.freeEggAt || 0) > FREE_EGG_COOLDOWN;
    const mins = Math.ceil((FREE_EGG_COOLDOWN - (Date.now() - (save.freeEggAt || 0))) / 60000);
    body.innerHTML = `
      <div class="tabs"><button class="btn ${tab === 'eggs' ? 'on' : ''}" data-t="eggs">🥚 Eggs</button>
      <button class="btn ${tab === 'park' ? 'on' : ''}" data-t="park">🌴 Park</button></div>
      <div class="grid"></div>`;
    const grid = body.querySelector('.grid');
    body.querySelectorAll('[data-t]').forEach((b) => on(b, () => { tab = b.dataset.t; render(); }));

    if (tab === 'eggs') {
      const items = [
        { id: 'free', pic: thumb('egg'), nm: 'Free Egg', sub: freeReady ? 'Watch a short video' : `Ready in ${mins} min`, btn: freeReady ? '🎬 Free' : '⏳', dis: !freeReady, cls: 'blue' },
        { id: 'egg', pic: thumb('egg'), nm: 'Dino Egg', sub: 'Who is inside?', btn: `🪙 ${ECONOMY.eggPrice}`, dis: save.coins < ECONOMY.eggPrice, cls: 'green' },
        { id: 'gold', pic: thumb('goldegg'), nm: 'Golden Egg', sub: 'Rare or Legendary!', btn: `🪙 ${ECONOMY.rareEggPrice}`, dis: save.coins < ECONOMY.rareEggPrice, cls: 'green' },
      ];
      for (const it of items) {
        const c = h(`<div class="card"><div class="pic">${it.pic}</div><div class="nm">${it.nm}</div><div class="sub">${it.sub}</div>
          <button class="btn small ${it.cls}" ${it.dis ? 'disabled' : ''}>${it.btn}</button></div>`);
        on(c, 'button', async () => {
          if (it.id === 'free') {
            const ok = await showRewarded();
            if (!ok) return;
            save.freeEggAt = Date.now();
            save.eggs++;
          } else if (it.id === 'egg') {
            save.coins -= ECONOMY.eggPrice;
            save.eggs++;
          } else {
            save.coins -= ECONOMY.rareEggPrice;
            save.rareEggs++;
          }
          persist();
          sfx.cheer();
          centerMsg('Egg added! 🥚', 'Tap Hatch to open it', 1400);
          render();
        }, 'coin');
        grid.appendChild(c);
      }
    } else {
      for (const d of DECOR) {
        const owned = save.decor.includes(d.id);
        const c = h(`<div class="card ${owned ? 'owned' : ''}"><div class="pic">${d.icon}</div><div class="nm">${d.name}</div>
          <div class="sub">${owned ? 'In your park!' : 'Make your park pretty'}</div>
          ${owned ? '' : `<button class="btn small green" ${save.coins < d.price ? 'disabled' : ''}>🪙 ${d.price}</button>`}</div>`);
        on(c, 'button', () => {
          save.coins -= d.price;
          save.decor.push(d.id);
          persist();
          m.close();
          onBuyDecor?.(d.id);
        }, 'coin');
        grid.appendChild(c);
      }
    }
  }
  render();
  return m;
}

// ---------------- DINO BOOK ----------------
export function openBook() {
  const body = h(`<div><div class="section-t" style="text-align:center">Found ${save.seen.length} / ${SPECIES.length} dinos</div><div class="grid"></div></div>`);
  const grid = body.querySelector('.grid');
  for (const sp of SPECIES) {
    const seen = save.seen.includes(sp.id);
    const c = h(`<div class="card ${seen ? '' : 'locked'}"><span class="rarity ${sp.rarity}">${sp.rarity}</span>
      <div class="pic">${thumb(sp.id)}</div><div class="nm">${seen ? sp.kind : '???'}</div>
      <div class="sub">${seen ? sp.fact : 'Hatch eggs to find me!'}</div></div>`);
    if (seen) on(c, () => sfx.roar(), null);
    grid.appendChild(c);
  }
  modal({ title: '📖 Dino Book', color: 'var(--pink)', body });
}

// ---------------- PARENTS (gated) ----------------
export function openParents() {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  const ans = a * b;
  const opts = new Set([ans]);
  while (opts.size < 4) opts.add(ans + (Math.floor(Math.random() * 9) - 4) * (Math.random() < 0.5 ? 1 : a));
  const list = [...opts].filter((x) => x > 0).sort(() => Math.random() - 0.5);
  while (list.length < 4) list.push(ans + list.length * 7);
  const body = h(`<div><div class="note">For grown-ups only</div><div class="gate-q">What is ${a} × ${b}?</div>
    <div class="gate-opts">${list.map((v) => `<button class="btn white" data-v="${v}">${v}</button>`).join('')}</div></div>`);
  const m = modal({ title: '👨‍👩‍👧 Parents', color: 'var(--blue)', body });
  body.querySelectorAll('[data-v]').forEach((btn) => on(btn, () => {
    if (+btn.dataset.v === ans) { m.close(); openSettings(); } else { m.close(); }
  }));
}

function openSettings() {
  const body = h(`<div>
    <div class="setting">🔊 Sound effects <button class="btn small snd ${save.sound ? 'green' : 'white'}">${save.sound ? 'ON' : 'OFF'}</button></div>
    <div class="setting">🎵 Music <button class="btn small mus ${save.music ? 'green' : 'white'}">${save.music ? 'ON' : 'OFF'}</button></div>
    <div class="setting">🔒 Privacy policy <button class="btn small white pp">Open</button></div>
    <div class="setting">🗑️ Reset progress <button class="btn small orange rst">Reset</button></div>
    <div class="note">Dino Rescue Park shows only kid-safe, non-personalised ads (G-rated). No personal data is collected. Rewarded videos are always optional.</div>
  </div>`);
  const m = modal({ title: '⚙️ Settings', color: 'var(--blue)', body });
  on(body, '.snd', () => { save.sound = !save.sound; persist(); m.close(); openSettings(); });
  on(body, '.mus', () => { setMusic(!save.music); persist(); m.close(); openSettings(); });
  on(body, '.pp', () => window.open(PRIVACY_POLICY_URL, '_blank'));
  let armed = false;
  on(body, '.rst', (e) => {
    if (!armed) { armed = true; e.target.textContent = 'Sure?'; return; }
    resetSave();
    m.close();
    engine.go('park', {});
  });
}

// ---------------- RESCUE MISSION SETUP ----------------
export function openRunSetup() {
  if (!save.dinos.length) {
    centerMsg('Hatch a dino first! 🥚', 'Tap the Hatch button', 1800);
    sfx.boing();
    return;
  }
  let selDino = save.lastRunDino && save.dinos.find((d) => d.uid === save.lastRunDino) ? save.lastRunDino : save.dinos[0].uid;
  let selWorld = save.lastWorld || 'jungle';
  const body = h('<div></div>');
  const m = modal({
    title: '🏃 Rescue Mission', color: 'var(--green)', body,
    foot: '<button class="btn big green go">GO! 🚀</button>',
  });
  function render() {
    body.innerHTML = `<div class="section-t">Pick your runner</div><div class="dino-pick"></div>
      <div class="section-t">Pick a world</div><div class="world-list"></div>
      <div class="note">Best distance: ${save.bestDistance} m</div>`;
    const dp = body.querySelector('.dino-pick');
    for (const d of save.dinos) {
      const o = h(`<div class="opt ${d.uid === selDino ? 'sel' : ''}">${thumb(d.species)}<div>${d.name}</div><div style="opacity:.6">Lv ${d.level}</div></div>`);
      on(o, () => { selDino = d.uid; render(); });
      dp.appendChild(o);
    }
    const wl = body.querySelector('.world-list');
    for (const w of WORLDS) {
      const locked = (w.unlock || 0) > save.bestDistance;
      const el = h(`<div class="world ${w.id === selWorld ? 'sel' : ''} ${locked ? 'locked' : ''}">
        <div class="sw" style="background:linear-gradient(#${w.sky[0].toString(16).padStart(6, '0')},#${w.ground.toString(16).padStart(6, '0')})"></div>
        <div><b>${locked ? '🔒 ' : ''}${w.name}</b><small>${locked ? `Run ${w.unlock} m to unlock` : 'Ready!'}</small></div></div>`);
      on(el, () => { if (locked) { sfx.boing(); return; } selWorld = w.id; render(); });
      wl.appendChild(el);
    }
    const sel = dp.querySelector('.sel');
    if (sel) dp.scrollLeft = sel.offsetLeft - 20;
  }
  render();
  on(m, '.go', () => {
    save.lastRunDino = selDino;
    save.lastWorld = selWorld;
    m.close();
    engine.go('runner', { uid: selDino, world: selWorld });
  }, 'pop');
}

export { SPECIES_BY_ID };
