// Close-up with one dino: feed, bath, play ball, sleep.
import * as THREE from 'three';
import { engine, pick, toScreen } from '../engine.js';
import { toon, mesh, makeSky, setSkyColors, Particles, flower, bush, roundTree, emojiSprite, damp, makeCloud } from '../gfx.js';
import { buildDino } from '../dino.js';
import { SPECIES_BY_ID } from '../data.js';
import { save, persist, clamp, giveXp, xpNeeded } from '../save.js';
import { ECONOMY } from '../config.js';
import { clearUI, h, on, uiRoot, floatText, centerMsg } from '../ui.js';
import { sfx } from '../audio.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
const particles = new Particles(scene);
let built = false;
let sky, hemi, sun, nightLight;
let dino = null, data = null, sp = null;
let tool = null;
let time = 0;
let flying = []; // food in the air
let ball = null;
let ballState = null;
let zzz = [];
let night = 0;
let lastRub = 0;
let lastTap = 0;
let statEls = {};
let uiTimer = 0;
let foam = [];
let rubbing = false;

const FOODS = [
  { id: 'apple', emoji: '🍎', meat: false },
  { id: 'leaf', emoji: '🥬', meat: false },
  { id: 'melon', emoji: '🍉', meat: false },
  { id: 'meat', emoji: '🍖', meat: true },
];
const MEAT_LOVERS = ['rex', 'spino', 'goldrex', 'ptera'];

function buildWorld() {
  sky = makeSky(0x7cc8ff, 0xe8f8ff);
  scene.add(sky);
  scene.fog = new THREE.Fog(0xd8f0ff, 25, 80);
  hemi = new THREE.HemisphereLight(0xffffff, 0x8fbf6a, 1.6);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff4e0, 2.3);
  sun.position.set(5, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  nightLight = new THREE.PointLight(0xa5b4fc, 0, 14);
  nightLight.position.set(0, 4, 3);
  scene.add(nightLight);

  const ground = mesh(new THREE.CircleGeometry(60, 40), toon(0x8ce06a), { receive: true, cast: false });
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const rug = mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.08, 32), toon(0xffe8a3), { receive: true, cast: false });
  rug.position.y = 0.04;
  scene.add(rug);
  const rug2 = mesh(new THREE.TorusGeometry(2.6, 0.14, 8, 40), toon(0xff922b), { cast: false });
  rug2.rotation.x = Math.PI / 2;
  rug2.position.y = 0.08;
  scene.add(rug2);

  const cols = [0x51cf66, 0x69db7c, 0x40c057];
  [[-6, -6], [6.5, -5], [-9, -1], [9, -2], [0, -10], [-3.5, -12], [4, -11]].forEach(([x, z], i) => {
    const t = roundTree(cols[i % 3], 2 + (i % 2));
    t.position.set(x, 0, z);
    scene.add(t);
  });
  for (let i = 0; i < 10; i++) {
    const b = bush(cols[i % 3], 0.8);
    const a = Math.PI + (i / 9) * Math.PI;
    b.position.set(Math.cos(a) * 5.5, 0, Math.sin(a) * 4 - 1.5);
    scene.add(b);
  }
  const fc = [0xff6b6b, 0xffd43b, 0xffffff, 0xcc5de8, 0xff8fab];
  for (let i = 0; i < 40; i++) {
    const f = flower(fc[i % 5]);
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 6;
    f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 1);
    scene.add(f);
  }
  for (let i = 0; i < 5; i++) {
    const c = makeCloud(1.5 + Math.random());
    c.position.set(-20 + i * 10, 14 + Math.random() * 5, -35);
    scene.add(c);
  }
  // Ball
  ball = new THREE.Group();
  const bm = mesh(new THREE.SphereGeometry(0.32, 18, 14), toon(0xff6b6b), { line: 0.02 });
  ball.add(bm);
  const stripe = mesh(new THREE.TorusGeometry(0.32, 0.05, 6, 24), toon(0xffffff), { cast: false });
  ball.add(stripe);
  const stripe2 = stripe.clone();
  stripe2.rotation.y = Math.PI / 2;
  ball.add(stripe2);
  ball.visible = false;
  scene.add(ball);
}

function foodMesh(id) {
  const g = new THREE.Group();
  if (id === 'apple') {
    g.add(mesh(new THREE.SphereGeometry(0.28, 14, 10), toon(0xff4d4d), { line: 0.02 }));
    const st = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 5), toon(0x6b4423));
    st.position.y = 0.3;
    g.add(st);
    const lf = mesh(new THREE.SphereGeometry(0.09, 8, 6), toon(0x51cf66));
    lf.scale.set(1.6, 0.4, 0.8);
    lf.position.set(0.1, 0.33, 0);
    g.add(lf);
  } else if (id === 'leaf') {
    const lf = mesh(new THREE.SphereGeometry(0.32, 12, 8), toon(0x51cf66), { line: 0.02 });
    lf.scale.set(0.7, 0.18, 1.3);
    g.add(lf);
    const v = mesh(new THREE.BoxGeometry(0.03, 0.08, 0.7), toon(0x2f9e44));
    g.add(v);
  } else if (id === 'melon') {
    const s = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.14, 16, 1, false, 0, Math.PI), toon(0xff6b6b), { line: 0.02 });
    s.rotation.x = Math.PI / 2;
    g.add(s);
    const rind = mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 16, Math.PI), toon(0x2f9e44));
    g.add(rind);
  } else {
    const m = mesh(new THREE.SphereGeometry(0.26, 12, 10), toon(0xb5651d), { line: 0.02 });
    m.scale.set(1, 0.9, 1.2);
    g.add(m);
    const bone = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), toon(0xfff4e6));
    bone.rotation.x = Math.PI / 2;
    bone.position.z = -0.35;
    g.add(bone);
    for (const x of [-0.06, 0.06]) {
      const k = mesh(new THREE.SphereGeometry(0.07, 6, 5), toon(0xfff4e6));
      k.position.set(x, 0, -0.55);
      g.add(k);
    }
  }
  return g;
}

// ---------- Actions ----------
function feed(food) {
  if (night > 0.5) return;
  if (data.hunger >= 97) {
    say("I'm full! 😋");
    dino.squish();
    sfx.boing();
    return;
  }
  const f = foodMesh(food.id);
  f.position.set((Math.random() - 0.5) * 1.5, 0.5, 4);
  scene.add(f);
  const mouth = new THREE.Vector3();
  dino.mouth.getWorldPosition(mouth);
  flying.push({ obj: f, from: f.position.clone(), to: mouth, t: 0, food });
  sfx.whoosh();
}

function eaten(food) {
  dino.chomp();
  sfx.chomp();
  const fav = food.meat === MEAT_LOVERS.includes(sp.id);
  data.hunger = clamp(data.hunger + 18);
  data.happy = clamp(data.happy + (fav ? 8 : 3));
  reward(fav ? 12 : 8);
  const mouth = new THREE.Vector3();
  dino.mouth.getWorldPosition(mouth);
  particles.burst(mouth, { count: 8, colors: [0xffd43b, 0xff8787, 0x8ce99a], size: 0.08, speed: 2, up: 2 });
  if (fav) {
    particles.burst(mouth.clone().add(new THREE.Vector3(0, 0.8, 0)), { count: 6, shape: 'heart', colors: [0xff6b9a], size: 0.22, speed: 1.5, up: 3 });
    say('Yummy! My favourite! 💖');
    setTimeout(() => dino.setMode('happy'), 400);
    setTimeout(() => dino.setMode('idle'), 1800);
  } else say('Yum! 😋');
}

function rub(p) {
  const hits = pick(camera, p, [dino.root]);
  if (!hits.length) return;
  const now = performance.now();
  if (now - lastRub < 60) return;
  lastRub = now;
  const pt = hits[0].point;
  particles.burst(pt, { count: 3, shape: 'sphere', colors: [0xffffff, 0xd0ebff, 0xe5dbff], size: 0.12 + Math.random() * 0.1, speed: 0.6, up: 1.4, gravity: -0.5, life: 1.6 });
  if (foam.length < 40) {
    const fm = mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 8, 6), toon(0xffffff, { transparent: true, opacity: 0.9, unique: true }), { cast: false });
    dino.root.worldToLocal(fm.position.copy(pt));
    dino.root.add(fm);
    foam.push(fm);
  }
  if (Math.random() < 0.4) sfx.bubble();
  const before = data.clean;
  data.clean = clamp(data.clean + 1.4);
  if (Math.random() < 0.3) reward(1);
  if (Math.random() < 0.05) { dino.squish(); sfx.giggle(); }
  if (before < 100 && data.clean >= 100) rinse();
}

function rinse() {
  say('Squeaky clean! ✨');
  sfx.cheer();
  data.happy = clamp(data.happy + 10);
  reward(10);
  // water shower
  particles.burst(new THREE.Vector3(0, 5, 0), { count: 60, shape: 'sphere', colors: [0x74c0fc, 0xa5d8ff], size: 0.07, speed: 1.2, up: 0, gravity: 9, life: 1 });
  setTimeout(() => {
    for (const f of foam) dino.root.remove(f);
    foam = [];
    particles.burst(new THREE.Vector3(0, 2.5, 0), { count: 20, shape: 'star', colors: [0xfff3bf, 0xffffff, 0xffd43b], size: 0.18, speed: 3, up: 4 });
  }, 700);
}

function throwBall() {
  if (ballState || night > 0.5) return;
  if (data.energy < 10) { say('Too sleepy… 😴'); sfx.boing(); return; }
  ballState = { t: 0 };
  ball.visible = true;
  sfx.jump();
}

function toggleSleep() {
  if (dino.mode === 'sleep') wake();
  else {
    dino.setMode('sleep');
    say('Good night! 🌙');
    sfx.snore();
  }
  buildUI();
}
function wake() {
  dino.setMode('happy');
  setTimeout(() => dino?.setMode('idle'), 1500);
  say('Good morning! ☀️');
  sfx.cheer();
}

function reward(xp) {
  const up = giveXp(data, xp);
  if (up) {
    save.coins += ECONOMY.levelUpReward;
    sfx.levelUp();
    centerMsg(`LEVEL ${data.level}! ⭐`, `+${ECONOMY.levelUpReward} 🪙 bonus`, 2000);
    particles.burst(new THREE.Vector3(0, 2, 0), { count: 70, speed: 7, up: 9, size: 0.16 });
    particles.burst(new THREE.Vector3(0, 2, 0), { count: 20, shape: 'star', colors: [0xffd43b], size: 0.3, speed: 4, up: 7 });
    dino.setScale(Math.min(1.25, 0.9 + data.level * 0.04));
  }
  persist();
}

function say(text) {
  const head = new THREE.Vector3();
  dino.headPivot.getWorldPosition(head);
  const s = toScreen(head.add(new THREE.Vector3(0, 1.4, 0)), camera);
  floatText(text, s.x, s.y);
}

// ---------- UI ----------
function buildUI() {
  clearUI();
  const top = h(`<div class="care-top"><button class="btn white round back">⬅</button>
    <div class="name-card"><div class="nm"><span>${data.name}</span><span>Lv ${data.level}</span></div><div class="xpbar"><i></i></div></div></div>`);
  on(top, '.back', () => engine.go('park'));
  uiRoot.appendChild(top);
  const stats = h(`<div class="stats pass">
    <div class="stat"><div class="ico">🍖</div><div class="bar"><i data-s="hunger"></i></div></div>
    <div class="stat"><div class="ico">🛁</div><div class="bar"><i data-s="clean"></i></div></div>
    <div class="stat"><div class="ico">😊</div><div class="bar"><i data-s="happy"></i></div></div>
    <div class="stat"><div class="ico">⚡</div><div class="bar"><i data-s="energy"></i></div></div></div>`);
  uiRoot.appendChild(stats);
  statEls = { xp: top.querySelector('.xpbar i'), lv: top.querySelector('.nm span:last-child') };
  stats.querySelectorAll('[data-s]').forEach((el) => (statEls[el.dataset.s] = el));

  const sleeping = dino.mode === 'sleep';
  const tools = h(`<div class="tools">
    <button class="btn green ${tool === 'feed' ? 'on' : ''}" data-t="feed" ${sleeping ? 'disabled' : ''}>🍎<small>Feed</small></button>
    <button class="btn blue ${tool === 'bath' ? 'on' : ''}" data-t="bath" ${sleeping ? 'disabled' : ''}>🧼<small>Bath</small></button>
    <button class="btn orange ${tool === 'play' ? 'on' : ''}" data-t="play" ${sleeping ? 'disabled' : ''}>⚽<small>Play</small></button>
    <button class="btn purple" data-t="sleep">${sleeping ? '☀️' : '🌙'}<small>${sleeping ? 'Wake' : 'Sleep'}</small></button></div>`);
  tools.querySelectorAll('[data-t]').forEach((b) => on(b, () => {
    const t = b.dataset.t;
    if (t === 'sleep') { tool = null; toggleSleep(); return; }
    tool = tool === t ? null : t;
    if (tool === 'play') throwBall();
    buildUI();
  }));
  uiRoot.appendChild(tools);

  if (tool === 'feed') {
    const tray = h(`<div class="tray">${FOODS.map((f) => `<div class="food" data-f="${f.id}">${f.emoji}</div>`).join('')}</div>`);
    tray.querySelectorAll('[data-f]').forEach((el) => on(el, () => feed(FOODS.find((f) => f.id === el.dataset.f)), null));
    uiRoot.appendChild(tray);
  }
  if (tool === 'bath') uiRoot.appendChild(h('<div class="hint pass" style="bottom:calc(110px + var(--safe-b))">🫧 Rub your dino to wash it!</div>'));
  if (tool === 'play') uiRoot.appendChild(h('<div class="hint pass" style="bottom:calc(110px + var(--safe-b))">⚽ Tap to throw the ball!</div>'));
  updateStats();
}

function color(v) {
  return v > 60 ? '#51cf66' : v > 30 ? '#fcc419' : '#fa5252';
}
function updateStats() {
  for (const k of ['hunger', 'clean', 'happy', 'energy']) {
    const el = statEls[k];
    if (!el) continue;
    el.style.width = data[k] + '%';
    el.style.background = color(data[k]);
  }
  if (statEls.xp) statEls.xp.style.width = (data.xp / xpNeeded(data.level)) * 100 + '%';
  if (statEls.lv) statEls.lv.textContent = 'Lv ' + data.level;
}

export const CareMode = {
  enter({ uid }) {
    if (!built) { buildWorld(); built = true; }
    data = save.dinos.find((d) => d.uid === uid) || save.dinos[0];
    sp = SPECIES_BY_ID[data.species];
    if (dino) scene.remove(dino.root);
    dino = buildDino(sp);
    dino.setScale(Math.min(1.25, 0.9 + data.level * 0.04));
    scene.add(dino.root);
    tool = null;
    night = 0;
    foam = [];
    setTimeout(() => { sfx.roar(); say(`Hi! I'm ${data.name}!`); }, 450);
    buildUI();
  },
  exit() {
    for (const f of flying) scene.remove(f.obj);
    flying = [];
    for (const z of zzz) scene.remove(z);
    zzz = [];
    ballState = null;
    ball.visible = false;
    particles.clear();
    persist();
    clearUI();
  },
  resize(w, h2) {
    camera.aspect = w / h2;
    camera.fov = w < h2 ? 56 : 38;
    camera.updateProjectionMatrix();
  },
  update(dt) {
    time += dt;
    const portrait = engine.w < engine.h;
    camera.position.set(Math.sin(time * 0.2) * 0.4, portrait ? 2.6 : 2.4, portrait ? 7.4 : 6.6);
    camera.lookAt(0, portrait ? 1.5 : 1.35, 0);

    // Day / night blend
    const sleeping = dino.mode === 'sleep';
    night = damp(night, sleeping ? 1 : 0, 2, dt);
    setSkyColors(sky, new THREE.Color(0x7cc8ff).lerp(new THREE.Color(0x1b1f4b), night), new THREE.Color(0xe8f8ff).lerp(new THREE.Color(0x4c4f9a), night));
    hemi.intensity = 1.6 - night * 1.0;
    sun.intensity = 2.3 - night * 2.0;
    nightLight.intensity = night * 18;
    scene.fog.color.set(0xd8f0ff).lerp(new THREE.Color(0x2e3270), night);

    // Stats drift
    data.hunger = clamp(data.hunger - dt * 0.15);
    data.clean = clamp(data.clean - dt * 0.1);
    if (sleeping) {
      data.energy = clamp(data.energy + dt * 9);
      if (Math.random() < dt * 1.2) {
        const z = emojiSprite('💤', 0.7);
        z.position.set(0.4, 2.8, 0.4);
        z.userData.t = 0;
        scene.add(z);
        zzz.push(z);
      }
      if (data.energy >= 100) { wake(); buildUI(); }
    }
    for (let i = zzz.length - 1; i >= 0; i--) {
      const z = zzz[i];
      z.userData.t += dt;
      z.position.y += dt * 0.6;
      z.position.x += Math.sin(z.userData.t * 3) * dt * 0.3;
      z.material.opacity = 1 - z.userData.t / 2.5;
      if (z.userData.t > 2.5) { scene.remove(z); zzz.splice(i, 1); }
    }

    // Food flight
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      f.t += dt * 1.6;
      const t = Math.min(1, f.t);
      f.obj.position.lerpVectors(f.from, f.to, t);
      f.obj.position.y += Math.sin(t * Math.PI) * 1.6;
      f.obj.rotation.x += dt * 8;
      f.obj.scale.setScalar(1 - Math.max(0, t - 0.85) * 5);
      if (t >= 1) { scene.remove(f.obj); flying.splice(i, 1); eaten(f.food); }
    }
    if (flying.length) dino.headPivot.rotation.x = damp(dino.headPivot.rotation.x, 0.05, 6, dt);

    // Ball game
    if (ballState) {
      ballState.t += dt;
      const t = ballState.t;
      const T = 1.3;
      const k = Math.min(1, t / T);
      ball.position.set(0, 0.4 + Math.sin(k * Math.PI) * 4.2, 3.2 - k * 2.6);
      ball.rotation.x += dt * 10;
      dino.setJump(k > 0.55 ? Math.sin(((k - 0.55) / 0.45) * Math.PI) * 1.2 : 0);
      if (k >= 1) {
        ball.visible = false;
        ballState = null;
        dino.setJump(0);
        dino.squish();
        dino.setMode('happy');
        sfx.cheer();
        data.happy = clamp(data.happy + 12);
        data.energy = clamp(data.energy - 6);
        data.hunger = clamp(data.hunger - 2);
        reward(10);
        say(['Wheee! 🎉', 'Again! Again!', 'Got it! ⚽', 'So fun! 💖'][Math.floor(Math.random() * 4)]);
        particles.burst(new THREE.Vector3(0, 2.6, 0.6), { count: 24, speed: 4, up: 5, size: 0.14 });
        setTimeout(() => dino?.setMode(dino.mode === 'sleep' ? 'sleep' : 'idle'), 1400);
      }
    }

    // Foam fades slowly
    for (const f of foam) f.scale.setScalar(0.9 + Math.sin(time * 4 + f.id) * 0.1);

    dino.update(dt, 0);
    particles.update(dt);
    uiTimer += dt;
    if (uiTimer > 0.2) { uiTimer = 0; updateStats(); }
  },
  render(r) { r.render(scene, camera); },
  pointer(type, p) {
    if (tool === 'bath') {
      if (type === 'down') rubbing = true;
      if (rubbing && (type === 'down' || type === 'move')) rub(p);
    }
    if (type === 'up') rubbing = false;
    if (type !== 'down') return;
    if (tool === 'play') { throwBall(); return; }
    if (tool === 'bath') return;
    const hits = pick(camera, p, [dino.root]);
    if (hits.length && performance.now() - lastTap > 400) {
      lastTap = performance.now();
      if (dino.mode === 'sleep') { say('Shhh… 😴'); return; }
      dino.squish();
      sfx.giggle();
      data.happy = clamp(data.happy + 2);
      particles.burst(hits[0].point, { count: 5, shape: 'heart', colors: [0xff6b9a, 0xff8fab], size: 0.2, speed: 1.5, up: 3 });
      if (Math.random() < 0.5) reward(2);
    }
  },
};
