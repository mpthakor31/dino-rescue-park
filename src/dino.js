// Procedural cute cartoon dinosaurs — every species is built from code.
import * as THREE from 'three';
import { toon, mesh } from './gfx.js';

const W = 0xffffff;
const DARK = 0x2b2340;

function capsule(r, len, seg = 8) {
  return new THREE.CapsuleGeometry(r, Math.max(0.01, len), 4, seg);
}

export function buildDino(sp, { lite = false, baby = false } = {}) {
  const L = lite ? 0 : 0.035; // outline thickness
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);

  const bodyMat = toon(sp.body, sp.features.includes('sparkle') ? { emissive: sp.body, emissiveIntensity: 0.18 } : {});
  const bellyMat = toon(sp.belly);
  const accentMat = toon(sp.accent);
  const spotMat = toon(sp.spots);

  const biped = sp.legs === 2;
  const flyer = sp.features.includes('flyer');
  const legLen = biped ? 0.75 : 0.55;
  const bodyR = 0.72;
  const bodyLenScale = biped ? 1.05 : 1.3;
  const flatY = sp.flat ? 0.68 : biped ? 1.0 : 0.85;

  // ---------- Body ----------
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = legLen + bodyR * flatY * 0.8;
  if (biped) bodyPivot.rotation.x = -0.32;
  bob.add(bodyPivot);

  const body = mesh(new THREE.SphereGeometry(bodyR, 22, 16), bodyMat, { line: L });
  body.scale.set(biped ? 0.92 : 1.0, flatY, bodyLenScale);
  bodyPivot.add(body);

  const belly = mesh(new THREE.SphereGeometry(bodyR * 0.8, 18, 12), bellyMat, { cast: false });
  belly.scale.set(0.82, flatY * 0.82, bodyLenScale * 0.7);
  belly.position.set(0, -bodyR * 0.2 * flatY, bodyR * bodyLenScale * 0.5);
  bodyPivot.add(belly);

  if (!lite) {
    for (let i = 0; i < 4; i++) {
      const s = mesh(new THREE.SphereGeometry(0.16 - i * 0.015, 10, 6), spotMat, { cast: false });
      s.scale.y = 0.35;
      const a = -0.6 + i * 0.4;
      s.position.set((i % 2 ? 0.25 : -0.22), bodyR * flatY * 0.9, a * bodyLenScale * 0.6);
      s.rotation.z = i % 2 ? -0.4 : 0.4;
      bodyPivot.add(s);
    }
  }

  // ---------- Neck + Head ----------
  const neckLen = 0.25 + sp.neck * 1.5;
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, bodyR * flatY * 0.35, bodyR * bodyLenScale * 0.72);
  const neckTilt = biped ? 0.35 : sp.neck > 0.5 ? 0.35 : 0.95;
  neckPivot.rotation.x = neckTilt;
  bodyPivot.add(neckPivot);

  const neck = mesh(capsule(0.27, neckLen), bodyMat, { line: L });
  neck.position.y = neckLen / 2;
  neckPivot.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.y = neckLen + 0.18;
  headPivot.rotation.x = -neckTilt - (biped ? -0.32 : 0) + 0.05;
  neckPivot.add(headPivot);

  const headR = baby ? 0.62 : 0.56;
  const head = mesh(new THREE.SphereGeometry(headR, 22, 16), bodyMat, { line: L });
  head.scale.set(1, 0.95, 1);
  head.position.set(0, 0.12, 0.08);
  headPivot.add(head);

  // Snout / beak
  let snout;
  if (flyer) {
    snout = mesh(new THREE.ConeGeometry(0.2, 0.9 * sp.snout, 10), toon(0xffd8a8), { line: L });
    snout.geometry.rotateX(Math.PI / 2);
    snout.position.set(0, 0.0, 0.75);
  } else {
    snout = mesh(new THREE.SphereGeometry(0.38, 18, 12), bodyMat, { line: L });
    snout.scale.set(0.95, 0.72, 0.85 * sp.snout);
    snout.position.set(0, -0.08, 0.38 + 0.12 * sp.snout);
  }
  headPivot.add(snout);

  // Mouth: a happy smile + an inner mouth that opens when chomping
  const mouth = new THREE.Group();
  if (flyer) mouth.position.set(0, -0.1, 0.42);
  else {
    const sd = 0.38 * 0.85 * sp.snout, sh = 0.38 * 0.72;
    mouth.position.set(0, snout.position.y - sh * 0.3, snout.position.z + sd * 0.93);
  }
  mouth.rotation.x = -0.35;
  const smile = mesh(new THREE.TorusGeometry(0.12, 0.028, 6, 18, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2b2340 }), { cast: false });
  smile.rotation.z = Math.PI;
  smile.position.y = 0.06;
  mouth.add(smile);
  const inner = mesh(new THREE.SphereGeometry(0.13, 14, 10), toon(0x8a2b3a), { cast: false });
  inner.scale.set(1.0, 0.05, 0.4);
  mouth.add(inner);
  const tongue = mesh(new THREE.SphereGeometry(0.07, 10, 8), toon(0xff8fa3), { cast: false });
  tongue.position.set(0, -0.06, 0.03);
  tongue.scale.set(1.2, 0.6, 0.8);
  tongue.visible = false;
  mouth.add(tongue);
  mouth.userData = { smile, inner, tongue };
  headPivot.add(mouth);

  if (!lite && sp.features.includes('teeth')) {
    for (const x of [-0.07, 0.07]) {
      const t = mesh(new THREE.ConeGeometry(0.03, 0.07, 5), toon(W), { cast: false });
      t.rotation.x = Math.PI;
      t.position.set(x, 0.03, 0.02);
      mouth.add(t);
    }
  }

  // Nostrils
  if (!flyer && !lite) {
    for (const x of [-0.1, 0.1]) {
      const n = mesh(new THREE.SphereGeometry(0.03, 6, 4), toon(DARK), { cast: false });
      n.position.set(x, 0.1, 0.48 + 0.25 * (sp.snout - 1) + 0.1);
      snout.parent.add(n);
      n.position.y = 0.02;
    }
  }

  // Eyes — big & sparkly
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.26, 0.28, 0.44);
    const white = mesh(new THREE.SphereGeometry(0.17, 16, 12), toon(W), { cast: false, line: lite ? 0 : 0.02 });
    eye.add(white);
    const pupil = mesh(new THREE.SphereGeometry(0.105, 14, 10), new THREE.MeshBasicMaterial({ color: 0x1a1428 }), { cast: false });
    pupil.position.set(side * 0.01, -0.01, 0.1);
    eye.add(pupil);
    if (!lite) {
      const hl = mesh(new THREE.SphereGeometry(0.038, 8, 6), new THREE.MeshBasicMaterial({ color: W }), { cast: false });
      hl.position.set(0.035, 0.045, 0.085);
      pupil.add(hl);
      const hl2 = mesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: W }), { cast: false });
      hl2.position.set(-0.04, -0.04, 0.09);
      pupil.add(hl2);
    }
    headPivot.add(eye);
    eyes.push(eye);
  }

  // Blush cheeks
  if (!lite) {
    for (const side of [-1, 1]) {
      const c = mesh(new THREE.CircleGeometry(0.09, 12), new THREE.MeshBasicMaterial({ color: 0xff8fab, transparent: true, opacity: 0.75 }), { cast: false });
      c.position.set(side * 0.43, 0.02, 0.33);
      c.rotation.y = side * 0.9;
      headPivot.add(c);
    }
  }

  // ---------- Tail ----------
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, -0.05, -bodyR * bodyLenScale * 0.8);
  tailRoot.rotation.x = biped ? 0.35 : 0.12;
  bodyPivot.add(tailRoot);
  const tailSegs = [];
  let parent = tailRoot;
  const nSeg = 3;
  for (let i = 0; i < nSeg; i++) {
    const r = 0.36 * (1 - i * 0.28);
    const len = (0.45 + sp.tail * 0.35) * (1 - i * 0.12);
    const pivot = new THREE.Group();
    const g = new THREE.ConeGeometry(r, len + r, 12);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -(len + r) / 2 + r * 0.5);
    const seg = mesh(g, bodyMat, { line: L ? 0.025 : 0 });
    pivot.add(seg);
    parent.add(pivot);
    tailSegs.push(pivot);
    const next = new THREE.Group();
    next.position.z = -len * 0.85;
    pivot.add(next);
    parent = next;
  }
  const tailTip = parent;

  // ---------- Legs ----------
  const legs = [];
  const legMat = bodyMat;
  const footMat = toon(sp.accent);
  const hipY = bodyPivot.position.y - bodyR * flatY * 0.45;
  const legPositions = biped
    ? [[-0.36, 0.0], [0.36, 0.0]]
    : [[-0.42, 0.62], [0.42, 0.62], [-0.42, -0.62], [0.42, -0.62]];
  legPositions.forEach(([x, z], i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, hipY, z);
    const thick = biped ? 0.2 : 0.19;
    const g = capsule(thick, legLen - 0.15);
    g.translate(0, -(legLen) / 2 + 0.05, 0);
    const leg = mesh(g, legMat, { line: L ? 0.03 : 0 });
    pivot.add(leg);
    if (biped) {
      const thigh = mesh(new THREE.SphereGeometry(0.3, 12, 10), legMat);
      thigh.scale.set(0.9, 1.1, 1.1);
      thigh.position.y = -0.05;
      pivot.add(thigh);
    }
    const foot = mesh(new THREE.SphereGeometry(thick * 1.25, 12, 8), footMat, { line: L ? 0.025 : 0 });
    foot.scale.set(1.05, 0.5, 1.35);
    foot.position.set(0, -legLen + 0.07, 0.07);
    pivot.add(foot);
    if (!lite) {
      for (const tx of [-0.09, 0, 0.09]) {
        const toe = mesh(new THREE.SphereGeometry(0.05, 6, 5), toon(W), { cast: false });
        toe.position.set(tx, -legLen + 0.06, 0.07 + thick * 1.2);
        pivot.add(toe);
      }
    }
    bob.add(pivot);
    legs.push({ pivot, phase: biped ? i * Math.PI : [0, Math.PI, Math.PI, 0][i] });
  });

  // ---------- Species features ----------
  const f = new Set(sp.features);
  const arms = [];
  if (f.has('tinyArms')) {
    for (const side of [-1, 1]) {
      const p = new THREE.Group();
      p.position.set(side * 0.42, 0.05, bodyR * bodyLenScale * 0.55);
      const g = capsule(0.08, 0.22);
      g.translate(0, -0.15, 0);
      const a = mesh(g, bodyMat);
      p.add(a);
      p.rotation.x = -0.9;
      bodyPivot.add(p);
      arms.push(p);
    }
  }
  if (f.has('frill')) {
    const frill = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.08, 20, 1, false, -Math.PI / 2, Math.PI), accentMat, { line: L ? 0.02 : 0 });
    frill.rotation.set(-Math.PI / 2 - 0.35, 0, 0);
    frill.position.set(0, 0.22, -0.38);
    frill.scale.setScalar(0.92);
    headPivot.add(frill);
    for (let i = 0; i < 5; i++) {
      const dot = mesh(new THREE.SphereGeometry(0.075, 8, 6), toon(sp.belly), { cast: false });
      const a = (i / 4) * Math.PI * 0.8 + Math.PI * 0.1;
      dot.position.set(Math.cos(a) * 0.6, -0.05, Math.sin(a) * 0.6);
      frill.add(dot);
    }
  }
  if (f.has('horns')) {
    const hm = toon(0xfff3d6);
    for (const side of [-1, 1]) {
      const h = mesh(new THREE.ConeGeometry(0.08, 0.5, 8), hm, { line: L ? 0.02 : 0 });
      h.position.set(side * 0.24, 0.62, 0.22);
      h.rotation.x = 0.6;
      headPivot.add(h);
    }
    const nh = mesh(new THREE.ConeGeometry(0.07, 0.28, 8), hm);
    nh.position.set(0, 0.22, 0.75);
    nh.rotation.x = 0.4;
    headPivot.add(nh);
  }
  if (f.has('plates')) {
    for (let i = 0; i < 6; i++) {
      const s = 0.42 - Math.abs(i - 2) * 0.07;
      const p = mesh(new THREE.ConeGeometry(s * 0.8, s * 1.4, 4), accentMat, { line: L ? 0.02 : 0 });
      p.scale.x = 0.25;
      const z = 0.7 - i * 0.32;
      p.position.set(0, bodyR * flatY * 0.95 + s * 0.4 - Math.abs(z) * 0.18, z * bodyLenScale * 0.7);
      bodyPivot.add(p);
    }
  }
  if (f.has('tailSpikes')) {
    for (const side of [-1, 1]) {
      for (const z of [0, -0.25]) {
        const s = mesh(new THREE.ConeGeometry(0.06, 0.4, 6), toon(0xfff3d6));
        s.position.set(side * 0.12, 0.12, z);
        s.rotation.z = side * -0.8;
        tailTip.add(s);
      }
    }
  }
  if (f.has('club')) {
    const c = mesh(new THREE.SphereGeometry(0.28, 12, 10), accentMat, { line: L ? 0.03 : 0 });
    c.scale.set(1.4, 0.8, 1);
    c.position.z = 0.05;
    tailTip.add(c);
  }
  if (f.has('armor')) {
    for (let i = 0; i < 12; i++) {
      const b = mesh(new THREE.SphereGeometry(0.11, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), accentMat, { cast: false });
      const row = i % 3;
      const col = Math.floor(i / 3);
      b.position.set((row - 1) * 0.36, bodyR * flatY * (row === 1 ? 0.98 : 0.82), (0.75 - col * 0.5) * bodyLenScale * 0.6);
      b.rotation.z = (row - 1) * -0.5;
      bodyPivot.add(b);
    }
  }
  if (f.has('sail')) {
    const s = new THREE.Shape();
    s.moveTo(-0.8, 0);
    s.quadraticCurveTo(-0.6, 0.9, 0, 1.05);
    s.quadraticCurveTo(0.6, 0.9, 0.8, 0);
    s.lineTo(-0.8, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false });
    g.translate(0, 0, -0.035);
    g.rotateY(Math.PI / 2);
    const sail = mesh(g, accentMat);
    sail.position.set(0, bodyR * flatY * 0.7, 0);
    bodyPivot.add(sail);
  }
  if (f.has('tubeCrest')) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.45, 0.25), new THREE.Vector3(0, 0.75, -0.2), new THREE.Vector3(0, 0.8, -0.8)]);
    const tube = mesh(new THREE.TubeGeometry(c, 16, 0.11, 8), accentMat, { line: L ? 0.02 : 0 });
    headPivot.add(tube);
  }
  if (f.has('crest')) {
    const c = mesh(new THREE.ConeGeometry(0.14, 0.9, 8), accentMat);
    c.rotation.x = -1.9;
    c.position.set(0, 0.45, -0.45);
    headPivot.add(c);
  }
  const wings = [];
  if (f.has('wings')) {
    for (const side of [-1, 1]) {
      const p = new THREE.Group();
      p.position.set(side * 0.45, 0.25, 0.1);
      const s = new THREE.Shape();
      s.moveTo(0, 0.3);
      s.lineTo(1.9, 0.1);
      s.quadraticCurveTo(1.2, -0.25, 0.9, -0.6);
      s.quadraticCurveTo(0.5, -0.3, 0, -0.5);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
      g.rotateX(Math.PI / 2);
      if (side < 0) g.scale(-1, 1, 1);
      const w = mesh(g, accentMat);
      p.add(w);
      bodyPivot.add(p);
      wings.push({ p, side });
    }
  }
  if (f.has('crown')) {
    const crown = new THREE.Group();
    const gold = toon(0xffd700, { emissive: 0xffaa00, emissiveIntensity: 0.3 });
    const ring = mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.14, 12, 1, true), gold);
    crown.add(ring);
    for (let i = 0; i < 5; i++) {
      const sp2 = mesh(new THREE.ConeGeometry(0.06, 0.18, 5), gold);
      const a = (i / 5) * Math.PI * 2;
      sp2.position.set(Math.cos(a) * 0.22, 0.14, Math.sin(a) * 0.22);
      crown.add(sp2);
    }
    const gem = mesh(new THREE.OctahedronGeometry(0.06), toon(0xff4d6d));
    gem.position.set(0, 0.02, 0.24);
    crown.add(gem);
    crown.position.set(0, 0.68, 0);
    crown.rotation.x = -0.15;
    headPivot.add(crown);
  }

  // Compute ground offset so feet touch y=0
  bob.position.y = 0.04;
  if (flyer) bob.position.y = 0.4;

  // ---------- Animation state ----------
  const st = {
    t: Math.random() * 10, phase: 0, blinkT: 2 + Math.random() * 3, blink: 0,
    chomp: 0, squish: 0, jumpY: 0, mode: 'idle', look: 0, lookT: 0,
    baseScale: baby ? 0.7 : 1,
  };
  root.scale.setScalar(st.baseScale);

  const api = {
    root, sp, headPivot, mouth,
    setScale(s) { st.baseScale = s; },
    setMode(m) { st.mode = m; },
    get mode() { return st.mode; },
    chomp() { st.chomp = 1; },
    squish() { st.squish = 1; },
    setJump(y) { st.jumpY = y; },
    update(dt, speed = 0) {
      st.t += dt;
      const t = st.t;
      const moving = speed > 0.01;
      st.phase += dt * (moving ? 6 + speed * 8 : 0);

      // legs
      for (const l of legs) {
        const target = moving ? Math.sin(st.phase + l.phase) * (0.45 + speed * 0.35) : 0;
        l.pivot.rotation.x += (target - l.pivot.rotation.x) * Math.min(1, dt * 12);
      }
      for (const a of arms) a.rotation.x = -0.9 + Math.sin(t * (moving ? 12 : 3)) * 0.25;

      // body bob & breathing
      let y = (flyer ? 0.4 + Math.sin(t * 3) * 0.12 : 0.04) + st.jumpY;
      if (moving) y += Math.abs(Math.sin(st.phase)) * 0.09;
      const breath = 1 + Math.sin(t * (st.mode === 'sleep' ? 1.5 : 2.5)) * 0.02;
      st.squish = Math.max(0, st.squish - dt * 2.5);
      const sq = Math.sin(st.squish * Math.PI * 3) * st.squish * 0.18;
      bob.position.y = y;
      bob.scale.set(breath + sq, breath - sq, breath + sq);
      root.scale.setScalar(st.baseScale);

      // tail wag
      tailSegs.forEach((s, i) => {
        s.rotation.y = Math.sin(t * (moving ? 7 : 2.5) - i * 0.8) * (0.15 + (st.mode === 'happy' ? 0.25 : 0)) * (1 + i * 0.3);
        s.rotation.x = 0.06 + Math.sin(t * 1.5 - i) * 0.04;
      });

      // wings flap
      for (const w of wings) w.p.rotation.z = w.side * (Math.sin(t * (moving ? 14 : 6)) * 0.5 + 0.1);

      // head look-around & modes
      st.lookT -= dt;
      if (st.lookT <= 0) { st.look = (Math.random() - 0.5) * 0.9; st.lookT = 1.5 + Math.random() * 2.5; }
      let headY = st.mode === 'idle' ? st.look : 0;
      let headX = 0;
      if (st.mode === 'sleep') headX = 0.35;
      if (st.mode === 'happy') headX = Math.sin(t * 10) * 0.08;
      headPivot.rotation.y += (headY - headPivot.rotation.y) * Math.min(1, dt * 4);
      const baseX = -neckTilt - (biped ? -0.32 : 0) + 0.05;
      headPivot.rotation.x += (baseX + headX - headPivot.rotation.x) * Math.min(1, dt * 5);

      // chomp
      st.chomp = Math.max(0, st.chomp - dt * 2.2);
      const open = Math.abs(Math.sin(st.chomp * Math.PI * 3)) * st.chomp;
      const mu = mouth.userData;
      mu.inner.scale.y = 0.05 + open * 0.9;
      mu.inner.position.y = -open * 0.05;
      mu.tongue.visible = open > 0.15;
      mu.smile.visible = open < 0.15;

      // blink / sleep
      st.blinkT -= dt;
      if (st.blinkT <= 0) { st.blink = 0.14; st.blinkT = 2.5 + Math.random() * 3; }
      st.blink = Math.max(0, st.blink - dt);
      const closed = st.mode === 'sleep' || st.blink > 0;
      const happyEyes = st.mode === 'happy';
      for (const e of eyes) e.scale.y += ((closed ? 0.08 : happyEyes ? 0.55 : 1) - e.scale.y) * Math.min(1, dt * 25);
    },
  };
  root.userData.dino = api;
  return api;
}

// Spotted egg model
export function buildEgg(color = 0xfff4e0, spot = 0x74c0fc, golden = false) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.7, 26, 20);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const k = y > 0 ? 1 + y * 0.35 : 1;
    pos.setY(i, y * 1.25);
    pos.setX(i, pos.getX(i) / k);
    pos.setZ(i, pos.getZ(i) / k);
  }
  geo.computeVertexNormals();
  const mat = golden ? toon(0xffd700, { emissive: 0xffa500, emissiveIntensity: 0.35 }) : toon(color);
  const shell = mesh(geo, mat, { line: 0.03 });
  g.add(shell);
  const sm = toon(golden ? 0xfff3b0 : spot);
  for (let i = 0; i < 9; i++) {
    const s = mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 10, 8), sm, { cast: false });
    const a = Math.random() * Math.PI * 2;
    const yy = (Math.random() - 0.4) * 1.2;
    const r = 0.7 / (yy > 0 ? 1 + yy * 0.28 : 1) * Math.sqrt(Math.max(0.15, 1 - (yy / 0.95) ** 2));
    s.position.set(Math.cos(a) * r * 0.97, yy, Math.sin(a) * r * 0.97);
    s.scale.setScalar(1);
    s.lookAt(0, yy, 0);
    s.scale.z = 0.3;
    g.add(s);
  }
  g.userData.shell = shell;
  return g;
}
