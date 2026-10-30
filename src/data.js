// All dinosaur species and park decorations.
// rarity: common (most eggs), rare, legendary (golden glow)

export const SPECIES = [
  {
    id: 'rex', name: 'Rexy', kind: 'T-Rex', rarity: 'common',
    body: 0x7ed957, belly: 0xf7f2b4, accent: 0x3f9e3a, spots: 0x5dbb47,
    legs: 2, arms: true, neck: 0.15, tail: 1.0, snout: 1.15,
    features: ['tinyArms', 'teeth'],
    fact: 'T-Rex teeth were as big as bananas!',
  },
  {
    id: 'tops', name: 'Topsy', kind: 'Triceratops', rarity: 'common',
    body: 0xffa94d, belly: 0xffe3b8, accent: 0xe5762a, spots: 0xff8f3a,
    legs: 4, neck: 0.1, tail: 0.6, snout: 0.9,
    features: ['frill', 'horns'],
    fact: 'Triceratops had three horns and a giant neck frill!',
  },
  {
    id: 'steg', name: 'Steggy', kind: 'Stegosaurus', rarity: 'common',
    body: 0xb197fc, belly: 0xe9e1ff, accent: 0xff6b9a, spots: 0x9775fa,
    legs: 4, neck: 0.15, tail: 0.9, snout: 0.8,
    features: ['plates', 'tailSpikes'],
    fact: 'Stegosaurus had a brain the size of a walnut!',
  },
  {
    id: 'bronty', name: 'Bronty', kind: 'Brontosaurus', rarity: 'common',
    body: 0x74c0fc, belly: 0xe3f2ff, accent: 0x4c9be8, spots: 0x5aaef7,
    legs: 4, neck: 1.0, tail: 1.3, snout: 0.8,
    features: ['longNeck'],
    fact: 'Brontosaurus was as long as three school buses!',
  },
  {
    id: 'ptera', name: 'Pteri', kind: 'Pterodactyl', rarity: 'rare',
    body: 0xff8fab, belly: 0xffe0ea, accent: 0xe8577e, spots: 0xff7096,
    legs: 2, neck: 0.2, tail: 0.25, snout: 1.4,
    features: ['wings', 'crest', 'flyer'],
    fact: 'Pterodactyls could fly but were not dinosaurs!',
  },
  {
    id: 'ankylo', name: 'Anky', kind: 'Ankylosaurus', rarity: 'rare',
    body: 0xffd43b, belly: 0xfff4c2, accent: 0xc99a0a, spots: 0xf2bf1c,
    legs: 4, neck: 0.05, tail: 0.9, snout: 0.85, flat: true,
    features: ['armor', 'club'],
    fact: 'Ankylosaurus was covered in armor like a tank!',
  },
  {
    id: 'spino', name: 'Spiny', kind: 'Spinosaurus', rarity: 'rare',
    body: 0x38d9a9, belly: 0xd3f9ec, accent: 0xff922b, spots: 0x20c997,
    legs: 2, arms: true, neck: 0.2, tail: 1.1, snout: 1.5,
    features: ['sail', 'tinyArms'],
    fact: 'Spinosaurus loved swimming and catching fish!',
  },
  {
    id: 'para', name: 'Paro', kind: 'Parasaurolophus', rarity: 'common',
    body: 0xff6b6b, belly: 0xffe3e3, accent: 0xffa94d, spots: 0xf25555,
    legs: 2, arms: true, neck: 0.3, tail: 1.0, snout: 1.0,
    features: ['tubeCrest'],
    fact: 'Parasaurolophus could honk like a trumpet!',
  },
  {
    id: 'goldrex', name: 'Sunny', kind: 'Golden T-Rex', rarity: 'legendary',
    body: 0xffd700, belly: 0xfff8d6, accent: 0xff9f1a, spots: 0xffc300,
    legs: 2, arms: true, neck: 0.15, tail: 1.0, snout: 1.15,
    features: ['tinyArms', 'teeth', 'crown', 'sparkle'],
    fact: 'Sunny is the rarest dino on the whole island!',
  },
  {
    id: 'icetops', name: 'Frosty', kind: 'Ice Triceratops', rarity: 'legendary',
    body: 0xa5f3fc, belly: 0xffffff, accent: 0x66d9e8, spots: 0x8ae6f5,
    legs: 4, neck: 0.1, tail: 0.6, snout: 0.9,
    features: ['frill', 'horns', 'sparkle'],
    fact: 'Frosty keeps the volcano cool with icy breath!',
  },
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export function rollSpecies(rare = false) {
  const r = Math.random();
  let pool;
  if (rare) pool = r < 0.15 ? 'legendary' : 'rare';
  else pool = r < 0.03 ? 'legendary' : r < 0.25 ? 'rare' : 'common';
  const list = SPECIES.filter((s) => s.rarity === pool);
  return list[Math.floor(Math.random() * list.length)];
}

// Things kids can buy to build their park. pos = [x, z] on the island.
export const DECOR = [
  { id: 'flowers', name: 'Flower Garden', icon: '🌸', price: 60, pos: [-6, 5] },
  { id: 'lollipop', name: 'Lollipop Trees', icon: '🍭', price: 90, pos: [7, 4] },
  { id: 'fountain', name: 'Splash Fountain', icon: '⛲', price: 150, pos: [0, -2] },
  { id: 'slide', name: 'Big Slide', icon: '🛝', price: 200, pos: [-7, -5] },
  { id: 'balloons', name: 'Balloon Arch', icon: '🎈', price: 120, pos: [6, -6] },
  { id: 'mushrooms', name: 'Giant Mushrooms', icon: '🍄', price: 110, pos: [-2, 9] },
  { id: 'rainbow', name: 'Rainbow Bridge', icon: '🌈', price: 300, pos: [0, -11] },
  { id: 'statue', name: 'Golden Egg Statue', icon: '🏆', price: 400, pos: [10, 0] },
];

export const WORLDS = [
  { id: 'jungle', name: 'Jungle Run', sky: [0x8fd3ff, 0xe6f7ff], ground: 0x8bd36b, path: 0xe9c98b, fog: 0xcfeeff, deco: 'jungle' },
  { id: 'volcano', name: 'Volcano Valley', sky: [0xff9a76, 0xffe0b2], ground: 0x7d5a45, path: 0xc8925f, fog: 0xffd2b0, deco: 'volcano', unlock: 300 },
  { id: 'ice', name: 'Icy Mountains', sky: [0x9fd8ff, 0xf4fbff], ground: 0xeaf6ff, path: 0xbfe3f7, fog: 0xe8f6ff, deco: 'ice', unlock: 700 },
  { id: 'candy', name: 'Candy Land', sky: [0xffb3d9, 0xfff0f8], ground: 0xffc9e6, path: 0xfff3b0, fog: 0xffe6f3, deco: 'candy', unlock: 1200 },
];
