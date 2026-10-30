// 3D models for buyable park decorations.
import * as THREE from 'three';
import { toon, mesh, flower } from './gfx.js';
import { buildEgg } from './dino.js';

const builders = {
  flowers() {
    const g = new THREE.Group();
    const cols = [0xff6b6b, 0xffd43b, 0xcc5de8, 0xff8fab, 0x4dabf7, 0xffffff];
    const bed = mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.3, 20), toon(0x8b5a2b), { receive: true });
    bed.position.y = 0.15;
    g.add(bed);
    const soil = mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.32, 20), toon(0x5c3d22), { cast: false });
    soil.position.y = 0.17;
    g.add(soil);
    for (let i = 0; i < 26; i++) {
      const f = flower(cols[i % cols.length]);
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.8;
      f.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
      f.scale.setScalar(1.2 + Math.random() * 0.6);
      g.add(f);
    }
    return g;
  },
  lollipop() {
    const g = new THREE.Group();
    const cols = [[0xff6b6b, 0xffffff], [0x51cf66, 0xffd43b], [0xcc5de8, 0x74c0fc]];
    cols.forEach(([a, b], i) => {
      const t = new THREE.Group();
      const stick = mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), toon(0xffffff));
      stick.position.y = 1.5;
      t.add(stick);
      for (let k = 0; k < 4; k++) {
        const ring = mesh(new THREE.TorusGeometry(0.85 - k * 0.2, 0.13, 8, 24), toon(k % 2 ? a : b));
        ring.position.y = 3.6;
        t.add(ring);
      }
      const disc = mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.22, 24), toon(a));
      disc.rotation.x = Math.PI / 2;
      disc.position.y = 3.6;
      disc.position.z = -0.02;
      t.add(disc);
      t.position.set((i - 1) * 2.2, 0, i === 1 ? -1 : 0);
      t.scale.setScalar(i === 1 ? 1.15 : 0.9);
      t.userData.spin = true;
      g.add(t);
    });
    g.userData.update = (dt, t) => g.children.forEach((c, i) => (c.rotation.y = Math.sin(t + i) * 0.3));
    return g;
  },
  fountain() {
    const g = new THREE.Group();
    const stone = toon(0xdee2e6);
    const water = toon(0x74c0fc, { transparent: true, opacity: 0.85 });
    const base = mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.7, 24), stone, { receive: true, line: 0.03 });
    base.position.y = 0.35;
    g.add(base);
    const pool = mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.1, 24), water, { cast: false });
    pool.position.y = 0.68;
    g.add(pool);
    const col = mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 12), stone);
    col.position.y = 1.4;
    g.add(col);
    const bowl = mesh(new THREE.CylinderGeometry(1.1, 0.4, 0.5, 18), stone, { line: 0.03 });
    bowl.position.y = 2.3;
    g.add(bowl);
    const top = mesh(new THREE.SphereGeometry(0.35, 12, 10), water);
    top.position.y = 2.75;
    g.add(top);
    const drops = [];
    const dm = new THREE.MeshBasicMaterial({ color: 0xd0ebff });
    for (let i = 0; i < 24; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), dm);
      d.userData = { a: (i / 24) * Math.PI * 2, t: Math.random() };
      g.add(d);
      drops.push(d);
    }
    g.userData.update = (dt) => {
      for (const d of drops) {
        d.userData.t = (d.userData.t + dt * 0.8) % 1;
        const t = d.userData.t;
        const r = 0.3 + t * 1.5;
        d.position.set(Math.cos(d.userData.a) * r, 2.8 + t * 1.6 - t * t * 3.6, Math.sin(d.userData.a) * r);
      }
    };
    return g;
  },
  slide() {
    const g = new THREE.Group();
    const wood = toon(0xff922b);
    const metal = toon(0x4dabf7);
    for (const x of [-0.7, 0.7]) for (const z of [-0.7, 0.7]) {
      const p = mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), wood);
      p.position.set(x, 1.6, z);
      g.add(p);
    }
    const plat = mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), toon(0xffd43b), { line: 0.03 });
    plat.position.y = 3.2;
    g.add(plat);
    const roof = mesh(new THREE.ConeGeometry(1.5, 1.2, 4), toon(0xff6b6b), { line: 0.03 });
    roof.position.y = 4.4;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3.2, 0.9), new THREE.Vector3(0, 2.4, 2.4), new THREE.Vector3(0.6, 1.0, 3.8), new THREE.Vector3(1.2, 0.3, 4.6),
    ]);
    const slide = mesh(new THREE.TubeGeometry(curve, 30, 0.55, 10, false), metal, { line: 0.02 });
    slide.scale.y = 0.6;
    slide.position.y = 0.9;
    g.add(slide);
    for (let i = 0; i < 5; i++) {
      const r = mesh(new THREE.BoxGeometry(1.4, 0.1, 0.12), wood);
      r.position.set(0, 0.5 + i * 0.6, -0.75);
      g.add(r);
    }
    return g;
  },
  balloons() {
    const g = new THREE.Group();
    const cols = [0xff6b6b, 0xffd43b, 0x51cf66, 0x4dabf7, 0xcc5de8, 0xff922b, 0xff8fab];
    const n = 13;
    const balls = [];
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1)) * Math.PI;
      const b = mesh(new THREE.SphereGeometry(0.55, 14, 12), toon(cols[i % cols.length]), { line: 0.02 });
      b.scale.y = 1.15;
      b.position.set(Math.cos(a) * 3, Math.sin(a) * 3.6 + 0.4, 0);
      b.userData.base = b.position.clone();
      g.add(b);
      balls.push(b);
    }
    g.userData.update = (dt, t) => balls.forEach((b, i) => (b.position.y = b.userData.base.y + Math.sin(t * 2 + i) * 0.08));
    return g;
  },
  mushrooms() {
    const g = new THREE.Group();
    [[0, 0, 1.4], [1.8, 0.6, 0.9], [-1.6, 0.5, 1.0], [0.4, -1.6, 0.7]].forEach(([x, z, s]) => {
      const m = new THREE.Group();
      const stem = mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 12), toon(0xfff4e6), { line: 0.03 });
      stem.position.y = 0.8;
      m.add(stem);
      const cap = mesh(new THREE.SphereGeometry(1.1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xff4d4d), { line: 0.03 });
      cap.scale.y = 0.75;
      cap.position.y = 1.5;
      m.add(cap);
      for (let i = 0; i < 6; i++) {
        const d = mesh(new THREE.SphereGeometry(0.16, 8, 6), toon(0xffffff), { cast: false });
        const a = (i / 6) * Math.PI * 2;
        d.position.set(Math.cos(a) * 0.65, 1.5 + 0.55, Math.sin(a) * 0.65);
        d.scale.y = 0.5;
        m.add(d);
      }
      m.position.set(x, 0, z);
      m.scale.setScalar(s);
      g.add(m);
    });
    return g;
  },
  rainbow() {
    const g = new THREE.Group();
    const cols = [0xff6b6b, 0xff922b, 0xffd43b, 0x51cf66, 0x4dabf7, 0x845ef7];
    cols.forEach((c, i) => {
      const t = mesh(new THREE.TorusGeometry(5 - i * 0.35, 0.18, 8, 40, Math.PI), toon(c), { cast: i === 0 });
      g.add(t);
    });
    const cloudM = toon(0xffffff);
    for (const x of [-4.2, 4.2]) {
      for (let k = 0; k < 3; k++) {
        const c = mesh(new THREE.SphereGeometry(0.9 - k * 0.15, 12, 10), cloudM);
        c.position.set(x + (k - 1) * 0.7, 0.3 + (k === 1 ? 0.3 : 0), 0);
        g.add(c);
      }
    }
    return g;
  },
  statue() {
    const g = new THREE.Group();
    const p1 = mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.6, 8), toon(0xced4da), { line: 0.03 });
    p1.position.y = 0.3;
    g.add(p1);
    const p2 = mesh(new THREE.CylinderGeometry(1.0, 1.1, 1.2, 8), toon(0xe9ecef), { line: 0.03 });
    p2.position.y = 1.2;
    g.add(p2);
    const egg = buildEgg(0xfff4e0, 0x74c0fc, true);
    egg.position.y = 2.6;
    egg.scale.setScalar(1.3);
    g.add(egg);
    g.userData.update = (dt, t) => { egg.rotation.y = t * 0.8; egg.position.y = 2.6 + Math.sin(t * 2) * 0.1; };
    return g;
  },
};

export function buildDecor(id) {
  const g = builders[id]();
  g.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; });
  return g;
}
