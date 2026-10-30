import { ECONOMY } from './config.js';

const KEY = 'dino_rescue_park_v1';
let uid = 0;

function fresh() {
  return {
    coins: ECONOMY.startCoins,
    eggs: 1,
    rareEggs: 0,
    dinos: [], // {uid, species, name, level, xp, hunger, clean, happy, energy}
    decor: [],
    seen: [], // species ids discovered
    bestDistance: 0,
    runs: 0,
    sound: true,
    music: true,
    lastSeen: Date.now(),
    tutorial: true,
  };
}

export const save = load();

function load() {
  let data = null;
  try {
    data = JSON.parse(localStorage.getItem(KEY));
  } catch (e) { /* storage unavailable */ }
  const s = Object.assign(fresh(), data || {});
  uid = s.dinos.reduce((m, d) => Math.max(m, d.uid), 0);
  // Stats slowly drop while the game is closed (max 1 day worth)
  const hours = Math.min(24, (Date.now() - (s.lastSeen || Date.now())) / 3.6e6);
  for (const d of s.dinos) {
    d.hunger = clamp(d.hunger - hours * 6);
    d.clean = clamp(d.clean - hours * 4);
    d.happy = clamp(d.happy - hours * 3);
    d.energy = clamp(d.energy + hours * 10);
  }
  return s;
}

export function persist() {
  save.lastSeen = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch (e) { /* ignore */ }
}

export function addDino(species) {
  const d = {
    uid: ++uid, species: species.id, name: species.name,
    level: 1, xp: 0, hunger: 70, clean: 80, happy: 80, energy: 90,
  };
  save.dinos.push(d);
  if (!save.seen.includes(species.id)) save.seen.push(species.id);
  persist();
  return d;
}

export function clamp(v, a = 0, b = 100) {
  return Math.max(a, Math.min(b, v));
}

export function xpNeeded(level) {
  return 60 + level * 40;
}

// Returns true if the dino levelled up
export function giveXp(d, amount) {
  d.xp += amount;
  if (d.xp >= xpNeeded(d.level)) {
    d.xp -= xpNeeded(d.level);
    d.level++;
    return true;
  }
  return false;
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  Object.assign(save, fresh());
  persist();
}

setInterval(persist, 15000);
