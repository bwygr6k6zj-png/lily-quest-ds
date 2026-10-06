'use strict';
/* =========================================================
   LILY QUEST DS — un petit RPG de capture de monstres
   ========================================================= */

// ---------- Utilitaires ----------
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (a, b, s) => (a < b ? Math.min(b, a + s) : Math.max(b, a - s));
const until = fn => new Promise(res => { const i = setInterval(() => { if (fn()) { clearInterval(i); res(); } }, 16); });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Son : bruitages et musique façon console ----------
const SOUND_KEY = 'lilyquest-ds-sound';
let audio = null, soundOn = true;
try { soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { /* stockage bloqué */ }
// Les navigateurs bloquent le son tant qu'on n'a pas touché la page : on le débloque au premier geste
function unlockAudio() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch (e) { /* pas de son, tant pis */ }
}
['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, unlockAudio, true));
function beep(freq = 660, dur = 0.06, type = 'square', vol = 0.05, slide = 0) {
  if (!soundOn || !audio) return;
  try {
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
  } catch (e) { /* pas de son, tant pis */ }
}
const tune = (notes, gap, dur, type = 'square', vol = 0.05) => notes.forEach((f, i) => setTimeout(() => beep(f, dur, type, vol), i * gap));
const sfx = {
  blip: () => beep(880, 0.05),
  hit: () => beep(220, 0.18, 'sawtooth', 0.08, -150),
  bump: () => beep(110, 0.06, 'square', 0.04),
  heal: () => tune([523, 659, 784, 1046], 110, 0.12, 'triangle', 0.08),
  level: () => tune([523, 659, 784, 659, 1046], 90, 0.1),
  catch: () => tune([784, 988, 1175, 1568], 140, 0.15, 'triangle', 0.08),
  encounter: () => tune([440, 415, 440, 415, 440, 523, 587], 70, 0.07),
  shake: () => beep(300, 0.08, 'triangle', 0.07),
  alert: () => tune([988, 1319], 80, 0.08),
};

// Musique : mélodies originales. Notes en croches ; « E5*2 » = 2 croches, « . » = silence, « | » = barre de mesure.
const SONGS = {
  title: { bpm: 100, ch: [
    { wave: 'square', vol: 0.03, notes: 'C5 E5 G5 C6*4 G5 | A5*2 F5*2 C6*4 | B5 A5 G5 F5 E5*2 D5 E5 | G5*8 | E5 G5 C6 E6*4 D6 | C6*2 A5*2 F5*4 | G5 A5 B5 D6 C6*2 B5 G5 | C6*8' },
    { wave: 'triangle', vol: 0.07, notes: 'C3*4 E3*4 | F2*4 A2*4 | G2*4 B2*4 | C3*4 G2*4 | C3*4 E3*4 | F2*4 A2*4 | G2*4 G3*4 | C3*4 C2*4' },
  ] },
  world: { bpm: 126, ch: [
    { wave: 'square', vol: 0.028, notes: 'E5 G5 C6*2 B5 G5 E5*2 | F5 A5 C6*2 B5 A5 G5*2 | E5 G5 C6 E6 D6*2 C6 B5 | A5*2 G5*2 . G5 A5 B5 | C6*2 A5 F5 E5*2 D5 C5 | F5 A5 C6*2 A5 G5 F5 E5 | D5 E5 F5 A5 G5*2 E5 C5 | D5*4 . G4 A4 B4' },
    { wave: 'triangle', vol: 0.07, notes: 'C3*2 G3*2 C3*2 G3*2 | F2*2 C3*2 F2*2 C3*2 | C3*2 G3*2 C3*2 G3*2 | G2*2 D3*2 G2*2 D3*2 | A2*2 E3*2 A2*2 E3*2 | F2*2 C3*2 F2*2 C3*2 | D3*2 A3*2 G2*2 D3*2 | G2*2 D3*2 G2*2 B2*2' },
  ] },
  battle: { bpm: 152, ch: [
    { wave: 'square', vol: 0.03, notes: 'A4 A4 C5 A4 D5 A4 E5 D5 | C5 A4 C5 E5 G5*2 F5 E5 | F5 F5 E5 D5 E5*2 C5 A4 | B4 C5 D5 B4 E5*4 | A5 A5 G5 E5 G5 A5*2 E5 | F5 E5 D5 C5 D5*2 E5 F5 | E5 D5 C5 B4 C5*2 A4 B4 | G#4*2 B4*2 E5*2 . .' },
    { wave: 'triangle', vol: 0.08, notes: 'A2 A3 A2 A3 A2 A3 A2 A3 | A2 A3 A2 A3 C3 C4 C3 C4 | F2 F3 F2 F3 F2 F3 F2 F3 | E2 E3 E2 E3 E2 E3 E2 E3 | A2 A3 A2 A3 A2 A3 A2 A3 | D2 D3 D2 D3 D2 D3 D2 D3 | F2 F3 F2 F3 F2 F3 F2 F3 | E2 E3 E2 E3 E2 E3 E2 E3' },
  ] },
};
const noteFreq = n => {
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  const midi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0) + (+m[3] + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
};
const parseNotes = str => str.split(/\s+/).filter(t => t && t !== '|').map(t => {
  const [n, mult] = t.split('*');
  return [n === '.' ? null : noteFreq(n), +(mult || 1)];
});
const music = { want: null, playing: null };
function startMusic(name) {
  const song = SONGS[name], step = 60 / song.bpm / 2;
  const chans = song.ch.map(c => ({ ...c, seq: parseNotes(c.notes), i: 0 }));
  chans.forEach(c => { c.len = c.seq.reduce((a, n) => a + n[1], 0); });
  const len = Math.max(...chans.map(c => c.len));
  const out = audio.createGain(); out.connect(audio.destination);
  const t0 = audio.currentTime + 0.08;
  chans.forEach(c => { c.at = t0; });
  const p = { name, step, chans, len, out };
  p.timer = setInterval(() => scheduleMusic(p), 60);
  music.playing = p; scheduleMusic(p);
}
function scheduleMusic(p) {
  const horizon = audio.currentTime + 0.3;
  for (const c of p.chans) {
    while (c.at < horizon) {
      const [f, d] = c.seq[c.i], dur = d * p.step;
      if (f) {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = c.wave; o.frequency.value = f;
        g.gain.setValueAtTime(c.vol, c.at); g.gain.setValueAtTime(c.vol, c.at + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, c.at + dur * 0.95);
        o.connect(g).connect(p.out); o.start(c.at); o.stop(c.at + dur);
      }
      c.at += dur;
      if (++c.i >= c.seq.length) { c.i = 0; c.at += (p.len - c.len) * p.step; }
    }
  }
}
function stopMusic() {
  const p = music.playing; if (!p) return;
  clearInterval(p.timer);
  try { p.out.gain.setTargetAtTime(0, audio.currentTime, 0.04); setTimeout(() => p.out.disconnect(), 400); } catch (e) { /* déjà arrêté */ }
  music.playing = null;
}
// Appelée à chaque image : lance, change ou coupe la musique selon l'écran et le réglage du son
function updateMusic(name) {
  music.want = name;
  const running = soundOn && audio && audio.state === 'running';
  const cur = music.playing && music.playing.name;
  if (!running || !name) { if (cur) stopMusic(); return; }
  if (cur !== name) { stopMusic(); startMusic(name); }
}

// ---------- Données : types, attaques, espèces ----------
const TYPES = { Feu: '#f08030', Eau: '#4a90e8', Plante: '#58b848', Normal: '#9a9a78', 'Élec': '#e8b820', Roche: '#b09040', Spectre: '#7058a8' };
const EFF = {
  Feu: { Plante: 2, Eau: 0.5, Feu: 0.5, Roche: 0.5 },
  Eau: { Feu: 2, Roche: 2, Eau: 0.5, Plante: 0.5 },
  Plante: { Eau: 2, Roche: 2, Feu: 0.5, Plante: 0.5 },
  'Élec': { Eau: 2, Plante: 0.5, 'Élec': 0.5, Roche: 0.5 },
  Roche: { Feu: 2, 'Élec': 2, Plante: 0.5 },
  Normal: { Roche: 0.5, Spectre: 0 },
  Spectre: { Spectre: 2, Normal: 0 },
};
const eff = (a, d) => (EFF[a] && EFF[a][d] !== undefined ? EFF[a][d] : 1);

const MOVES = {
  griffe: { name: 'Griffe', type: 'Normal', pow: 40, acc: 100 },
  charge: { name: 'Charge', type: 'Normal', pow: 40, acc: 100 },
  picpic: { name: 'Picpic', type: 'Normal', pow: 35, acc: 100 },
  morsure: { name: 'Mordille', type: 'Normal', pow: 55, acc: 95 },
  ruee: { name: 'Ruée', type: 'Normal', pow: 70, acc: 95 },
  flammeche: { name: 'Flammèche', type: 'Feu', pow: 45, acc: 100 },
  brasier: { name: 'Brasier', type: 'Feu', pow: 75, acc: 90 },
  inferno: { name: 'Inferno', type: 'Feu', pow: 95, acc: 85 },
  ecume: { name: 'Écume', type: 'Eau', pow: 45, acc: 100 },
  vague: { name: 'Vaguelette', type: 'Eau', pow: 75, acc: 90 },
  hydro: { name: 'Hydro-Jet', type: 'Eau', pow: 95, acc: 85 },
  fouet: { name: 'Fouet Liane', type: 'Plante', pow: 45, acc: 100 },
  tempete: { name: 'Tempête Florale', type: 'Plante', pow: 75, acc: 90 },
  solaire: { name: 'Rayon Soleil', type: 'Plante', pow: 95, acc: 85 },
  zap: { name: 'Zap', type: 'Élec', pow: 50, acc: 100 },
  foudre: { name: 'Foudre', type: 'Élec', pow: 80, acc: 85 },
  jetpierre: { name: 'Jet-Pierre', type: 'Roche', pow: 50, acc: 90 },
  eboulement: { name: 'Éboulement', type: 'Roche', pow: 75, acc: 90 },
  lechouille: { name: 'Léchouille', type: 'Spectre', pow: 30, acc: 100 },
  ombre: { name: 'Ombre', type: 'Spectre', pow: 50, acc: 100 },
  cauchemar: { name: 'Cauchemar', type: 'Spectre', pow: 80, acc: 95 },
};

// base : [PV, Attaque, Défense, Vitesse]
const SPECIES = {
  flamiaou: { name: 'Flamiaou', type: 'Feu', base: [45, 55, 40, 65], rate: 0.3, evo: [16, 'pyrolion'],
    learn: [[1, 'griffe'], [1, 'flammeche'], [7, 'morsure'], [13, 'brasier']],
    desc: 'Un chaton espiègle. Sa queue brûle plus fort quand il est content.',
    look: { shape: 'cat', c1: '#f5873a', c2: '#ffe2a8' } },
  pyrolion: { name: 'Pyrolion', type: 'Feu', base: [72, 88, 62, 85], rate: 0.1,
    learn: [[1, 'griffe'], [1, 'flammeche'], [7, 'morsure'], [13, 'brasier'], [22, 'inferno']],
    desc: 'Sa crinière de braises peut faire fondre la roche.',
    look: { shape: 'cat', c1: '#e0502a', c2: '#ffd878', mane: '#ffaa2a', big: true } },
  aquapin: { name: 'Aquapin', type: 'Eau', base: [50, 48, 52, 58], rate: 0.3, evo: [16, 'aqualapin'],
    learn: [[1, 'charge'], [1, 'ecume'], [7, 'morsure'], [13, 'vague']],
    desc: 'Ce lapin adore sauter dans les flaques. Ses oreilles captent la pluie.',
    look: { shape: 'rabbit', c1: '#5aa8f0', c2: '#e8f6ff' } },
  aqualapin: { name: 'Aqualapin', type: 'Eau', base: [78, 78, 80, 72], rate: 0.1,
    learn: [[1, 'charge'], [1, 'ecume'], [7, 'morsure'], [13, 'vague'], [22, 'hydro']],
    desc: 'Il nage plus vite qu\'un bateau grâce à sa queue-nageoire.',
    look: { shape: 'rabbit', c1: '#3a7ee0', c2: '#d8f0ff', big: true } },
  feuillon: { name: 'Feuillon', type: 'Plante', base: [55, 50, 50, 50], rate: 0.3, evo: [16, 'sylvaron'],
    learn: [[1, 'charge'], [1, 'fouet'], [7, 'morsure'], [13, 'tempete']],
    desc: 'Il fait la sieste au soleil pour faire pousser ses feuilles.',
    look: { shape: 'sprout', c1: '#7cc84e', c2: '#e2f8b0' } },
  sylvaron: { name: 'Sylvaron', type: 'Plante', base: [82, 76, 78, 66], rate: 0.1,
    learn: [[1, 'charge'], [1, 'fouet'], [7, 'morsure'], [13, 'tempete'], [22, 'solaire']],
    desc: 'La fleur sur sa tête embaume toute la forêt.',
    look: { shape: 'sprout', c1: '#4fae3a', c2: '#d2f2a0', big: true } },
  piouli: { name: 'Piouli', type: 'Normal', base: [40, 45, 38, 72], rate: 0.5,
    learn: [[1, 'picpic'], [1, 'charge'], [9, 'morsure'], [15, 'ruee']],
    desc: 'Un petit oiseau bavard qui chante dès l\'aube.',
    look: { shape: 'bird', c1: '#b8845a', c2: '#f4e2c4', c3: '#8a5a38' } },
  ratounet: { name: 'Ratounet', type: 'Normal', base: [35, 52, 35, 75], rate: 0.55,
    learn: [[1, 'charge'], [3, 'griffe'], [8, 'morsure'], [14, 'ruee']],
    desc: 'Il grignote tout ce qu\'il trouve. Même les cailloux.',
    look: { shape: 'mouse', c1: '#9a7ac8', c2: '#efe4ff', c3: '#7a5aa8' } },
  voltacelle: { name: 'Voltacelle', type: 'Élec', base: [42, 55, 40, 82], rate: 0.4,
    learn: [[1, 'charge'], [1, 'zap'], [15, 'foudre']],
    desc: 'Ses ailes vibrent si vite qu\'elles produisent de l\'électricité.',
    look: { shape: 'bug', c1: '#ffd84a', c2: '#3a3020' } },
  caillouton: { name: 'Caillouton', type: 'Roche', base: [55, 62, 85, 25], rate: 0.4,
    learn: [[1, 'charge'], [5, 'jetpierre'], [15, 'eboulement']],
    desc: 'On le confond souvent avec un rocher. Il adore ça.',
    look: { shape: 'rock', c1: '#a8a49a', c2: '#d4d0c6', c3: '#7a766c' } },
  fantomi: { name: 'Fantômi', type: 'Spectre', base: [45, 60, 45, 78], rate: 0.35,
    learn: [[1, 'lechouille'], [6, 'ombre'], [16, 'cauchemar']],
    desc: 'Il se cache dans les herbes la nuit pour faire « Bouh ! ».',
    look: { shape: 'ghost', c1: '#9a7ad8', c2: '#c8b0f0', outline: '#2a1640', mouth: false } },
};
const DEX = Object.keys(SPECIES);

// ---------- Monstres ----------
const xpFor = l => l * l * l;
function stats(m) {
  const b = SPECIES[m.id].base, l = m.lvl, s = x => Math.floor(x * 2 * l / 100) + 5;
  return { hp: Math.floor(b[0] * 2 * l / 100) + l + 10, atk: s(b[1]), def: s(b[2]), spd: s(b[3]) };
}
function makeMon(id, lvl) {
  const m = { id, lvl, xp: xpFor(lvl), moves: [], hp: 0 };
  for (const [l, mv] of SPECIES[id].learn) if (l <= lvl && !m.moves.includes(mv)) { m.moves.push(mv); if (m.moves.length > 4) m.moves.shift(); }
  m.hp = stats(m).hp;
  return m;
}
const nm = m => SPECIES[m.id].name;
const hpColor = p => (p > 50 ? '#48d048' : p > 20 ? '#f0c020' : '#f04838');

// ---------- Carte ----------
// T arbre · ~ eau · , hautes herbes · . herbe · = chemin · F fleurs · R toit · H mur
// D maison · P centre de soin · X arène · S panneau
const MAP_SRC = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T,,,,,TT....RRRRRR....TT,,,,,T',
  'T,,,,,TT....RRRRRR....TT,,,,,T',
  'T,,,,,......HHHHHH......,,,,,T',
  'T,,,,,......HHHXHH......,,,,,T',
  'T,,,,,..F.....==....F...,,,,,T',
  'T,,,,,........==........,,,,,T',
  'TTTTTTTTTTTT..==..TTTTTTTTTTTT',
  'T.....,,,,,,..==..,,,,,,.....T',
  'T..~~~,,,,,,..==..,,,,,,..S..T',
  'T.~~~~~,,,,,..==..,,,,,......T',
  'T.~~~~~.......==.......,,,,,,T',
  'T..~~~...TT...==...TT..,,,,,,T',
  'T........TT...==...TT........T',
  'T,,,,,,,......==......,,,,,,,T',
  'T,,,,,,,..F...==...F..,,,,,,,T',
  'T,,,,,,,......==......,,,,,,,T',
  'TTTTTTTTTTTT..==..TTTTTTTTTTTT',
  'T.....F.......==.......F.....T',
  'T..RRRRR......==.....RRRRR...T',
  'T..RRRRR......==.....RRRRR...T',
  'T..HHDHH......==.....HHPHH...T',
  'T....===================.....T',
  'T.............==.............T',
  'T..F..F.......==.......F..F..T',
  'T~~~~~........==........~~~~~T',
  'T~~~~~~................~~~~~~T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
const MW = 30, MH = MAP_SRC.length;
const MAP = MAP_SRC.map(r => r.padEnd(MW, 'T').slice(0, MW));
const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? 'T' : MAP[y][x]);
const SOLID = new Set(['T', '~', 'R', 'H', 'X', 'S']);
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const SIGNS = { '26,9': 'Route 1 — Attention ! Des Monstres sauvages se cachent dans les hautes herbes.' };

const NPCS = [
  { id: 'prof', x: 10, y: 23, dir: 'down', name: 'Prof. Lilas',
    colors: { hair: '#d8d8e0', shirt: '#ffffff', pants: '#5a5f78', skin: '#f2c8a0' } },
  { id: 't1', x: 13, y: 13, dir: 'right', name: 'Gamin Léo', trainer: true, team: [['ratounet', 4], ['piouli', 5]],
    intro: 'Hé ! Nos regards se sont croisés : combat !', lose: 'Oh non, mes Monstres...', after: 'Je vais m\'entraîner encore plus fort !',
    colors: { hat: '#3a9a4a', hair: '#5a3a2a', shirt: '#f0c040', pants: '#3a5a9a', skin: '#f2c8a0' } },
  { id: 't2', x: 16, y: 9, dir: 'left', name: 'Dresseuse Mia', trainer: true, team: [['voltacelle', 7], ['caillouton', 8]],
    intro: 'Mes Monstres vont te secouer, bzzt !', lose: 'Bzzt... perdu !', after: 'Astuce : les Monstres Roche résistent au Feu.',
    colors: { hair: '#e0708a', shirt: '#6ac8e8', pants: '#ffffff', skin: '#f6d2b0' } },
  { id: 'champ', x: 15, y: 5, dir: 'down', name: 'Champion Orion', trainer: true,
    team: [['caillouton', 13], ['fantomi', 14], ['voltacelle', 14], ['pyrolion', 16]],
    intro: 'Tu as traversé toute la Route 1 ? Montre-moi ta force !', lose: 'Quelle puissance... Incroyable !', after: 'Reviens me voir quand tu veux, Champion·ne !',
    colors: { hair: '#2a2a3a', shirt: '#3a3a5a', pants: '#2a2a3a', skin: '#e8b890', cape: '#8a3ad0' } },
];
NPCS.forEach(n => { n.hx = n.x; n.hy = n.y; n.hdir = n.dir; });
const npcAt = (x, y) => NPCS.find(n => n.x === x && n.y === y);
// Objets cachés : une étincelle à ramasser avec A (une seule fois par partie)
const ITEMS = [
  { id: 'spark1', x: 11, y: 16, item: 'potion', qty: 1 },
];
const ITEM_NAMES = { potion: 'Potion', ball: 'Ball' };
const itemAt = (x, y) => G && ITEMS.find(i => i.x === x && i.y === y && !G.flags[i.id]);
const walkable = (x, y) => !SOLID.has(tileAt(x, y)) && !npcAt(x, y) && !itemAt(x, y);

const TIPS = [
  'Prof. Lilas : Affaiblis un Monstre avant de lancer une Ball, tu auras plus de chances !',
  'Prof. Lilas : Le Feu bat la Plante, la Plante bat l\'Eau, et l\'Eau bat le Feu.',
  'Prof. Lilas : Au Centre (la porte bleue), tes Monstres sont soignés gratuitement.',
  'Prof. Lilas : Les Spectres ne craignent pas les attaques Normal... et inversement !',
  'Prof. Lilas : Vers le niveau 16, certains Monstres évoluent !',
];

// ---------- Rendu : canvas ----------
const topCv = $('#top'), ctx = topCv.getContext('2d');
const bottom = $('#bottom');
ctx.imageSmoothingEnabled = false;
const FONT = '8px "Press Start 2P", monospace';

function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
function ell(g, x, y, rx, ry, c, rot = 0) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); }
function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
function txt(g, s, x, y, c = '#202838', align = 'left', size = 8) {
  g.font = size === 8 ? FONT : `${size}px "Press Start 2P", monospace`;
  g.textBaseline = 'top'; g.textAlign = align; g.fillStyle = c; g.fillText(s, x, y);
}

// ----- Sprites des Monstres (dessinés puis « pixelisés ») -----
const S = 40;
const spriteCache = {}, whiteCache = {}, urlCache = {};
function drawCreature(g, L) {
  const { c1, c2 } = L, E = (...a) => ell(g, ...a), P = (p, c) => poly(g, p, c);
  switch (L.shape) {
    case 'cat':
      if (L.mane) {
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; P([20 + Math.cos(a) * 16, 17 + Math.sin(a) * 14, 20 + Math.cos(a + 0.3) * 9, 17 + Math.sin(a + 0.3) * 8, 20 + Math.cos(a - 0.3) * 9, 17 + Math.sin(a - 0.3) * 8], L.mane); }
        E(20, 17, 13, 12, L.mane);
      }
      P([26, 31, 35, 27, 33, 19], c1);
      E(35, L.big ? 13 : 15, L.big ? 4 : 3, L.big ? 7 : 4.5, '#ff6a1a'); E(35, L.big ? 15 : 16, 2, L.big ? 4 : 2.5, '#ffd23f');
      E(20, 29, 9, 8, c1); E(20, 31, 5, 5, c2); E(15, 37, 3, 2, c1); E(25, 37, 3, 2, c1);
      P([10, 14, 11, 3, 18, 9], c1); P([30, 14, 29, 3, 22, 9], c1);
      P([12, 11, 12, 6, 16, 9], '#ffb0b0'); P([28, 11, 28, 6, 24, 9], '#ffb0b0');
      E(20, 17, 10, 8, c1); E(20, 21, 4.5, 2.5, c2);
      L.eyes = [[15, 15], [23, 15]];
      break;
    case 'rabbit':
      E(14, 9, 3, 8, c1, -0.2); E(26, 9, 3, 8, c1, 0.2);
      E(14, 10, 1.4, 5.5, '#ffb6c8', -0.2); E(26, 10, 1.4, 5.5, '#ffb6c8', 0.2);
      if (L.big) P([24, 31, 38, 22, 36, 37], c2); else E(30, 32, 3.5, 3.5, c2);
      E(20, 30, 9, 7, c1); E(20, 31, 5, 5, c2); E(14, 37, 3.5, 2, c1); E(26, 37, 3.5, 2, c1);
      E(20, 19, 9, 7, c1); E(14, 22, 2, 1.2, '#ffb6c8'); E(26, 22, 2, 1.2, '#ffb6c8');
      if (L.big) P([17, 14, 20, 9, 23, 14], '#ffd23f');
      L.eyes = [[16, 17], [22, 17]];
      break;
    case 'sprout':
      if (L.big) { E(7, 28, 5, 2.5, '#3d8a2e', 0.5); E(33, 28, 5, 2.5, '#3d8a2e', -0.5); }
      P([19, 18, 21, 18, 21, 9, 19, 9], '#3d7a2a');
      E(13, 10, 7, 3, '#4fae3a', -0.45); E(27, 10, 7, 3, '#4fae3a', 0.45);
      if (L.big) { E(20, 6, 4.5, 4.5, '#ff7ab0'); E(20, 6, 1.8, 1.8, '#ffe066'); }
      E(20, 27, 11, 10, c1); E(20, 31, 7, 5, c2); E(14, 37, 3, 2, c1); E(26, 37, 3, 2, c1);
      L.eyes = [[15, 23], [23, 23]];
      break;
    case 'bird':
      P([17, 11, 19, 3, 21, 10], c2); P([20, 11, 23, 4, 24, 12], c2);
      E(20, 24, 11, 11, c1); E(9, 25, 4, 7, L.c3, 0.35); E(31, 25, 4, 7, L.c3, -0.35);
      E(20, 29, 7, 6, c2);
      P([17, 22, 23, 22, 20, 26], '#f5a623');
      E(15, 37, 2.5, 1.5, '#f5a623'); E(25, 37, 2.5, 1.5, '#f5a623');
      L.eyes = [[15, 18], [23, 18]]; L.mouth = false;
      break;
    case 'mouse':
      P([27, 33, 36, 31, 38, 22, 35, 22, 34, 28, 27, 30], L.c3);
      E(11, 11, 6, 6, c1); E(29, 11, 6, 6, c1); E(11, 11, 3.5, 3.5, '#ffb6c8'); E(29, 11, 3.5, 3.5, '#ffb6c8');
      E(20, 30, 9, 7, c1); E(20, 31, 5, 5, c2); E(15, 37, 3, 2, c1); E(25, 37, 3, 2, c1);
      E(20, 19, 10, 8, c1); E(20, 23, 1.6, 1.3, '#ff5a7a');
      L.eyes = [[15, 17], [23, 17]]; L.mouth = false;
      break;
    case 'bug':
      E(11, 18, 7, 4, '#e0f6ff', 0.6); E(29, 18, 7, 4, '#e0f6ff', -0.6);
      P([16, 12, 18, 11, 13, 3, 11, 4], c2); P([24, 12, 22, 11, 27, 3, 29, 4], c2);
      E(12, 3, 2.4, 2.4, '#ff5a3a'); E(28, 3, 2.4, 2.4, '#ff5a3a');
      g.save(); g.beginPath(); g.ellipse(20, 28, 9, 9, 0, 0, Math.PI * 2); g.clip();
      g.fillStyle = c1; g.fillRect(0, 0, 40, 40); g.fillStyle = c2; g.fillRect(0, 26, 40, 2); g.fillRect(0, 31, 40, 2); g.restore();
      E(20, 17, 8, 7, c1);
      L.eyes = [[16, 15], [22, 15]];
      break;
    case 'rock':
      E(6, 28, 3.5, 4.5, c1); E(34, 28, 3.5, 4.5, c1);
      P([9, 37, 6, 26, 10, 14, 19, 8, 29, 11, 34, 21, 32, 37], c1);
      P([12, 16, 19, 11, 25, 12, 20, 15], c2);
      E(13, 31, 3, 2, L.c3); E(28, 23, 3, 2, L.c3); E(24, 33, 2, 1.5, L.c3);
      L.eyes = [[15, 20], [23, 20]];
      break;
    case 'ghost':
      E(20, 17, 12, 12, c1); P([8, 17, 32, 17, 32, 30, 8, 30], c1);
      P([8, 29, 8, 37, 12, 33, 16, 38, 20, 33, 24, 38, 28, 33, 32, 37, 32, 29], c1);
      E(6, 22, 3, 2, c1); E(34, 22, 3, 2, c1); E(16, 10, 4, 3, c2);
      E(20, 24, 3.5, 2.5, '#3a1a4a'); E(20, 25.5, 2, 1, '#ff7aa8');
      L.eyes = [[14, 15], [23, 15]]; L.eyeH = 4;
      break;
  }
}
function pixelize(g, outline) {
  const d = g.getImageData(0, 0, S, S), p = d.data;
  for (let i = 3; i < p.length; i += 4) p[i] = p[i] > 110 ? 255 : 0;
  const a = new Uint8Array(S * S); for (let i = 0; i < S * S; i++) a[i] = p[i * 4 + 3];
  const o = [1, 3, 5].map(i => parseInt(outline.slice(i, i + 2), 16));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x; if (a[i]) continue;
    const near = (x > 0 && a[i - 1]) || (x < S - 1 && a[i + 1]) || (y > 0 && a[i - S]) || (y < S - 1 && a[i + S]);
    if (near) { p[i * 4] = o[0]; p[i * 4 + 1] = o[1]; p[i * 4 + 2] = o[2]; p[i * 4 + 3] = 255; }
  }
  g.putImageData(d, 0, 0);
}
function sprite(id) {
  if (spriteCache[id]) return spriteCache[id];
  const [c, g] = newCanvas(S, S), L = { ...SPECIES[id].look };
  drawCreature(g, L);
  pixelize(g, L.outline || '#20182a');
  const eh = L.eyeH || 3;
  for (const [x, y] of L.eyes) { g.fillStyle = '#1a1020'; g.fillRect(x, y, 2, eh); g.fillStyle = '#fff'; g.fillRect(x, y, 1, 1); }
  if (L.mouth !== false && L.shape !== 'ghost') { g.fillStyle = '#5a2a2a'; g.fillRect(19, L.eyes[0][1] + 5, 2, 1); }
  return (spriteCache[id] = c);
}
function whiteSprite(id) {
  if (whiteCache[id]) return whiteCache[id];
  const [c, g] = newCanvas(S, S);
  g.drawImage(sprite(id), 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  return (whiteCache[id] = c);
}
const spriteURL = id => urlCache[id] || (urlCache[id] = sprite(id).toDataURL());

function drawMon(g, id, x, y, { flip = false, alpha = 1, scale = 1, white = false } = {}) {
  if (alpha <= 0 || scale <= 0) return;
  g.save(); g.globalAlpha = alpha;
  const s = 80 * scale, ox = x + (80 - s) / 2, oy = y + (80 - s);
  g.translate(flip ? ox + s : ox, oy); if (flip) g.scale(-1, 1);
  g.drawImage(white ? whiteSprite(id) : sprite(id), 0, 0, s, s);
  g.restore();
}

// ----- Personnages -----
function drawPerson(g, x, y, dir, step, c) {
  const r = (a, b, w, h, col) => { g.fillStyle = col; g.fillRect(x + a, y + b, w, h); };
  r(3, 14, 10, 2, 'rgba(0,0,0,.22)');
  const bob = step ? -1 : 0;
  r(5, 12, 2, step === 1 ? 2 : 3, c.pants); r(9, 12, 2, step === 2 ? 2 : 3, c.pants);
  y += bob;
  if (c.cape && dir !== 'down') r(3, 8, 10, 6, c.cape);
  r(4, 8, 8, 5, c.shirt); r(3, 8, 1, 4, c.skin); r(12, 8, 1, 4, c.skin);
  if (c.cape && dir === 'down') { r(3, 8, 1, 6, c.cape); r(12, 8, 1, 6, c.cape); }
  r(4, 2, 8, 6, c.skin);
  if (dir === 'up') r(4, 2, 8, 6, c.hair);
  else if (dir === 'down') { r(4, 2, 8, 2, c.hair); r(4, 4, 1, 2, c.hair); r(11, 4, 1, 2, c.hair); r(6, 5, 1, 2, '#222'); r(9, 5, 1, 2, '#222'); }
  else if (dir === 'left') { r(4, 2, 8, 2, c.hair); r(9, 2, 3, 5, c.hair); r(5, 5, 1, 2, '#222'); }
  else { r(4, 2, 8, 2, c.hair); r(4, 2, 3, 5, c.hair); r(10, 5, 1, 2, '#222'); }
  if (c.hat) {
    r(3, 0, 10, 3, c.hat); r(6, 1, 4, 1, '#fff');
    if (dir === 'down') r(4, 3, 8, 1, c.hat); else if (dir === 'left') r(1, 2, 4, 1, c.hat); else if (dir === 'right') r(11, 2, 4, 1, c.hat);
  }
}
const HERO = { hat: '#e03848', hair: '#6a3a1a', shirt: '#3a6ad8', pants: '#2a2a48', skin: '#f6d2b0' };
const personCache = {};
function personCanvas(key, colors, dir = 'down') {
  if (personCache[key]) return personCache[key];
  const [c, g] = newCanvas(16, 16); drawPerson(g, 0, 0, dir, 0, colors);
  return (personCache[key] = c);
}

// ----- Tuiles (carte pré-rendue en deux images pour animer l'eau) -----
const ROOFS = { home: ['#d85050', '#b03a3a', '#882828'], center: ['#4a80d8', '#3462b0', '#244a88'], arena: ['#8a5ac8', '#6a40a0', '#4a2a78'] };
const roofOf = (x, y) => (y < 5 ? ROOFS.arena : x < 12 ? ROOFS.home : ROOFS.center);
function drawTile(g, ch, x, y, fr) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(a, b, w, h); };
  const grass = () => {
    r(0, 0, 16, 16, '#8cd46c');
    if ((x * 7 + y * 13) % 3 === 0) { r(3, 4, 1, 2, '#6cb850'); r(4, 3, 1, 1, '#6cb850'); r(11, 10, 1, 2, '#6cb850'); r(12, 9, 1, 1, '#6cb850'); }
  };
  const wall = () => { r(0, 0, 16, 16, '#f4ead2'); r(0, 15, 16, 1, '#b8a888'); r(0, 0, 16, 1, '#d8ccb0'); };
  const flower = (a, b, c) => { r(a + 1, b + 3, 1, 2, '#3a8a2e'); r(a + 1, b, 1, 1, c); r(a, b + 1, 3, 1, c); r(a + 1, b + 2, 1, 1, c); r(a + 1, b + 1, 1, 1, '#ffb000'); };
  switch (ch) {
    case '.': grass(); break;
    case ',':
      r(0, 0, 16, 16, '#5cb444');
      for (const bx of [0, 8]) for (const by of [0, 8]) {
        r(bx + 1, by + 3, 2, 5, '#3a8a2e'); r(bx + 3, by + 1, 2, 7, '#2f7a26'); r(bx + 5, by + 3, 2, 5, '#3a8a2e'); r(bx + 3, by + 2, 1, 3, '#8ae070');
      }
      break;
    case 'T':
      grass();
      r(6, 11, 4, 5, '#7a4a2a'); r(6, 11, 1, 5, '#5a3418');
      r(4, 0, 8, 1, '#2e7a3a'); r(2, 1, 12, 1, '#2e7a3a'); r(1, 2, 14, 8, '#2e7a3a'); r(0, 4, 16, 5, '#2e7a3a'); r(2, 10, 12, 1, '#245e2c');
      r(1, 8, 14, 2, '#245e2c'); r(3, 2, 4, 3, '#4ea04a'); r(4, 1, 2, 1, '#4ea04a');
      break;
    case '~': {
      r(0, 0, 16, 16, '#4a8ee0'); const o = fr * 3;
      r((2 + o) % 16, 4, 5, 1, '#9ccaf8'); r((10 + o) % 16, 11, 5, 1, '#9ccaf8'); r((6 + o) % 16, 7, 3, 1, '#6aaaf0');
      if (tileAt(x, y - 1) !== '~') r(0, 0, 16, 2, '#d8eefc');
      break;
    }
    case '=': r(0, 0, 16, 16, '#e8d49c'); r(3, 5, 1, 1, '#cdb67a'); r(11, 3, 1, 1, '#cdb67a'); r(7, 12, 1, 1, '#cdb67a'); r(13, 10, 1, 1, '#cdb67a'); break;
    case 'F': grass(); flower(2, 2, '#ff5a7a'); flower(9, 8, '#ffffff'); flower(11, 1, '#ffd23f'); break;
    case 'R': {
      const [c, s, d] = roofOf(x, y); r(0, 0, 16, 16, c);
      for (let i = 3; i < 16; i += 4) r(0, i, 16, 1, s);
      if (tileAt(x, y + 1) !== 'R') r(0, 13, 16, 3, d);
      if (tileAt(x, y - 1) !== 'R') r(0, 0, 16, 2, d);
      break;
    }
    case 'H':
      wall();
      if (x % 2 === 0) { r(4, 4, 8, 7, '#6a4a3a'); r(5, 5, 6, 5, '#8ad0f8'); r(5, 5, 2, 1, '#ffffff'); r(8, 5, 1, 5, '#6a4a3a'); }
      break;
    case 'D': wall(); r(3, 3, 10, 13, '#5a3418'); r(4, 4, 8, 12, '#9a6038'); r(10, 10, 1, 1, '#ffd23f'); break;
    case 'P': wall(); r(2, 2, 12, 14, '#34508a'); r(3, 3, 10, 13, '#a8e0ff'); r(7, 3, 1, 13, '#34508a'); r(6, 5, 4, 1, '#e03a3a'); r(7, 4, 2, 3, '#e03a3a'); break;
    case 'X': wall(); r(3, 3, 10, 13, '#3a1a5a'); r(4, 4, 8, 12, '#7a4aa8'); r(7, 6, 2, 2, '#ffd23f'); break;
    case 'S': grass(); r(7, 9, 2, 6, '#7a4a2a'); r(2, 2, 12, 8, '#6a3a1a'); r(3, 3, 10, 6, '#c8945a'); r(4, 5, 8, 1, '#8a5a2a'); r(4, 7, 6, 1, '#8a5a2a'); break;
  }
}
const mapFrames = [0, 1].map(fr => {
  const [c, g] = newCanvas(MW * 16, MH * 16);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { g.save(); g.translate(x * 16, y * 16); drawTile(g, MAP[y][x], x, y, fr); g.restore(); }
  return c;
});

// ---------- État du jeu ----------
let G = null;            // partie sauvegardée
let mode = 'boot';       // 'world' : on peut marcher · 'event' : une scène est en cours · 'battle'
let topScene = 'title';  // ce qu'affiche l'écran du haut
let B = null;            // combat en cours
let dlg = null, menu = null, overlay = null, introPick = null, tick = 0;
const P = { moving: false, t: 0, fx: 0, fy: 0, step: 0 };
const SAVE_KEY = 'lilyquest-ds-save', TOKEN_KEY = 'lilyquest-ds-token';

// ---------- Comptes joueurs (pseudo + mot de passe, sauvegarde en ligne) ----------
const account = { user: null, token: null, offline: false };
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* stockage bloqué */ } },
  del: k => { try { localStorage.removeItem(k); } catch (e) { /* stockage bloqué */ } },
};
async function api(path, { method = 'POST', body } = {}) {
  let r;
  try {
    r = await fetch(`/api/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(account.token ? { Authorization: `Bearer ${account.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) { throw Object.assign(new Error('Serveur injoignable. Vérifie ta connexion.'), { status: 0 }); }
  const d = await r.json().catch(() => null);
  if (!r.ok || !d) throw Object.assign(new Error((d && d.error) || 'Serveur injoignable.'), { status: d ? r.status : 0 });
  return d;
}
// Les erreurs « serveur absent » (jeu ouvert en local, comptes pas encore activés) permettent de jouer hors ligne
const serverDown = e => e.status === 0 || e.status === 404 || e.status === 503;
function setAccount(user, token) {
  account.user = user; account.token = token;
  if (token) store.set(TOKEN_KEY, token); else store.del(TOKEN_KEY);
}
const localKey = () => (account.user ? `${SAVE_KEY}:${account.user.toLowerCase()}` : SAVE_KEY);

let cloudTimer = null;
function save() {
  if (!G) return;
  G.savedAt = Date.now();
  store.set(localKey(), JSON.stringify(G));
  if (account.user) { clearTimeout(cloudTimer); cloudTimer = setTimeout(pushCloud, 1200); }
}
async function pushCloud() {
  clearTimeout(cloudTimer); cloudTimer = null;
  if (!account.user || !G) return true;
  try { await api('save', { body: { save: G } }); return true; }
  catch (e) { console.warn('Sauvegarde en ligne impossible :', e.message); return false; }
}
// Dernière chance d'envoyer la partie quand on ferme l'onglet
addEventListener('pagehide', () => {
  if (!cloudTimer || !account.user || !G) return;
  fetch('/api/save', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account.token}` }, body: JSON.stringify({ save: G }) });
});
const validSave = s => !!(s && Array.isArray(s.team) && s.team.length && s.team.every(m => SPECIES[m.id]));
function loadSave() {
  try { const s = JSON.parse(store.get(localKey())); if (validSave(s)) return s; } catch (e) { /* ignore */ }
  return null;
}
// Garde la plus récente entre la sauvegarde en ligne et celle de cet appareil
async function loadBestSave() {
  const local = loadSave();
  if (!account.user) return local;
  const { save: cloud } = await api('save', { method: 'GET' });
  if (!validSave(cloud)) return local;
  return local && (local.savedAt || 0) > (cloud.savedAt || 0) ? local : cloud;
}
const healAll = () => G.team.forEach(m => { m.hp = stats(m).hp; });
const markSeen = id => { G.seen[id] = 1; };

// ---------- Dialogues (écran du haut) ----------
function wrap(text) {
  ctx.font = FONT;
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > 232 && line) { lines.push(line); line = w; } else line = t;
    }
    lines.push(line);
  }
  return lines;
}
async function say(text) {
  const lines = wrap(text);
  for (let i = 0; i < lines.length; i += 3) {
    await new Promise(res => { dlg = { lines: lines.slice(i, i + 3), shown: 0, res }; });
  }
}
const dlgLen = () => dlg.lines.join('').length;
function dlgAdvance() {
  if (!dlg) return;
  if (dlg.shown < dlgLen()) { dlg.shown = dlgLen(); return; }
  const r = dlg.res; dlg = null; sfx.blip(); r();
}

// ---------- Menus (écran du bas, tactile + clavier) ----------
function choose(opts, { cols = 1, title = '', back, cls = '' } = {}) {
  return new Promise(res => {
    const sel = Math.max(0, opts.findIndex(o => !o.disabled));
    menu = { opts, cols, title, back, cls, sel, res };
    renderMenu();
  });
}
function renderMenu() {
  const m = menu;
  bottom.innerHTML = `<div class="panel ${m.cls}">
    ${m.title ? `<div class="mtitle">${m.title}</div>` : ''}
    <div class="grid" style="--cols:${m.cols}">${m.opts.map((o, i) =>
      `<button class="opt ${o.cls || ''} ${i === m.sel ? 'sel' : ''}" data-i="${i}" ${o.disabled ? 'disabled' : ''}>${o.html || esc(o.label)}</button>`).join('')}</div>
    ${m.back !== undefined ? '<button class="opt back" data-i="back">◀ Retour</button>' : ''}
  </div>`;
  bottom.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); menuPick(b.dataset.i === 'back' ? 'back' : +b.dataset.i);
  }));
}
function menuPick(i) {
  const m = menu; if (!m) return;
  let v;
  if (i === 'back') { if (m.back === undefined) return; v = m.back; }
  else { const o = m.opts[i]; if (!o || o.disabled) return; v = o.value; }
  menu = null; sfx.blip(); renderIdle(); m.res(v);
}
function menuNav(d) {
  const m = menu, n = m.opts.length, step = { up: -m.cols, down: m.cols, left: -1, right: 1 }[d];
  let s = m.sel;
  for (let k = 0; k < n; k++) { s = clamp(s + step, 0, n - 1); if (!m.opts[s].disabled) break; }
  if (m.opts[s].disabled) return;
  m.sel = s; beep(660, 0.03);
  bottom.querySelectorAll('.grid .opt').forEach((b, i) => b.classList.toggle('sel', i === s));
}
function monHtml(m) {
  const s = stats(m), p = m.hp / s.hp * 100;
  return `<img src="${spriteURL(m.id)}" alt=""><span class="info"><span class="row"><span>${nm(m)}</span><span>N${m.lvl}</span></span>
    <span class="hpbar"><i style="width:${p}%;background:${hpColor(p)}"></i></span><small>${m.hp}/${s.hp} PV</small></span>`;
}
function moveHtml(id) {
  const mv = MOVES[id];
  return `<b>${mv.name}</b><small><span class="type" style="background:${TYPES[mv.type]}">${mv.type}</span><span>Puis. ${mv.pow}</span></small>`;
}
function chooseMon(title, ok, canBack = true) {
  return choose(G.team.map((m, i) => ({ value: i, html: monHtml(m), cls: 'mon', disabled: !ok(m, i) })), { cols: 2, title, back: canBack ? 'back' : undefined, cls: 'compact' });
}
function askName() {
  return new Promise(res => {
    bottom.innerHTML = `<form class="panel center" id="nameForm"><div class="mtitle">Comment t'appelles-tu ?</div>
      <input id="nameIn" maxlength="10" placeholder="${esc(account.user || 'Lily')}" autocomplete="off" spellcheck="false">
      <button class="opt sel" type="submit">OK ▶</button></form>`;
    const f = $('#nameForm'), inp = $('#nameIn');
    setTimeout(() => inp.focus(), 50);
    f.addEventListener('click', e => e.stopPropagation());
    f.onsubmit = e => { e.preventDefault(); const v = (inp.value.trim() || account.user || 'Lily').slice(0, 10); inp.blur(); sfx.blip(); res(v); };
  });
}

function loginPanel() {
  return new Promise(res => {
    bottom.innerHTML = `<form class="panel login" id="loginForm">
      <div class="mtitle">Compte joueur</div>
      <input id="loginUser" maxlength="16" placeholder="Pseudo" autocomplete="username" autocapitalize="off" spellcheck="false" required>
      <input id="loginPass" type="password" maxlength="100" placeholder="Mot de passe (6+)" autocomplete="current-password" required>
      <p class="err" id="loginErr"></p>
      <div class="row2"><button class="opt sel" type="submit" value="login">Se connecter</button><button class="opt" type="submit" value="register">Créer un compte</button></div>
      <button class="link" type="button" id="loginOffline">Jouer sans compte (sur cet appareil)</button>
    </form>`;
    const f = $('#loginForm'), u = $('#loginUser'), p = $('#loginPass'), err = $('#loginErr');
    const busy = on => f.querySelectorAll('button').forEach(b => { b.disabled = on; });
    f.addEventListener('click', e => e.stopPropagation());
    setTimeout(() => u.focus(), 50);
    $('#loginOffline').onclick = () => { sfx.blip(); res(null); };
    f.onsubmit = async e => {
      e.preventDefault();
      const action = (e.submitter && e.submitter.value) || 'login';
      err.textContent = action === 'register' ? 'Création du compte...' : 'Connexion...';
      busy(true);
      try {
        const d = await api('auth', { body: { action, username: u.value.trim(), password: p.value } });
        setAccount(d.username, d.token);
        if (document.activeElement) document.activeElement.blur();
        sfx.heal(); res(d.username);
      } catch (ex) { err.textContent = ex.message; sfx.bump(); busy(false); }
    };
  });
}

// ---------- Panneaux « au repos » de l'écran du bas ----------
const ballsHtml = list => Array.from({ length: 6 }, (_, i) => `<span class="ball ${!list[i] ? 'none' : list[i].hp > 0 ? '' : 'ko'}"></span>`).join('');
function renderIdle() {
  if (menu) return;
  if (topScene === 'battle' && B) {
    const me = G.team[B.mi];
    bottom.innerHTML = `<div class="panel">
      <div class="bp-row"><span>${B.trainer ? esc(B.trainer.name) : 'Monstre sauvage'}</span><span class="balls">${B.trainer ? ballsHtml(B.enemyTeam) : ''}</span></div>
      <div class="bp-mid">${me ? `<img src="${spriteURL(me.id)}" alt=""><span>${nm(me)}<br>N${me.lvl}</span>` : ''}</div>
      <div class="bp-row"><span>${esc(G.name)}</span><span class="balls">${ballsHtml(G.team)}</span></div>
      <p class="hint" style="text-align:center">▼ Appuie sur A</p></div>`;
  } else if (topScene === 'world' && G) {
    const badge = G.flags.champ ? ' <span class="badge">★</span>' : '';
    bottom.innerHTML = `<div class="panel">
      <div class="wtop"><span>${esc(G.name)}${badge}${account.user ? ' <small class="cloud" title="Sauvegarde en ligne">☁</small>' : ''}</span><span class="bag">Ball×${G.items.ball} · Potion×${G.items.potion} <button class="snd" data-snd>${soundOn ? '♪ ON' : '♪ OFF'}</button></span></div>
      <div class="wteam">${Array.from({ length: 6 }, (_, i) => {
        const m = G.team[i]; if (!m) return '<div class="wmon empty"></div>';
        const p = m.hp / stats(m).hp * 100;
        return `<button class="wmon" data-w="team"><img src="${spriteURL(m.id)}" alt=""><span class="info"><span>N${m.lvl}</span><span class="hpbar"><i style="width:${p}%;background:${hpColor(p)}"></i></span></span></button>`;
      }).join('')}</div>
      <div class="wbtns">
        <button class="opt" data-w="team">Équipe</button><button class="opt" data-w="bag">Sac</button>
        <button class="opt" data-w="dex">Dex</button><button class="opt" data-w="save">Sauver</button>
      </div>
      <p class="hint" style="text-align:center">▼ Appuie sur A</p></div>`;
    bottom.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openMenu(b.dataset.w); }));
    bottom.querySelector('[data-snd]').addEventListener('click', e => { e.stopPropagation(); toggleSound(); });
  } else {
    bottom.innerHTML = `<div class="panel center"><p class="hint">▼ Appuie sur A</p></div>`;
  }
}

// ---------- Monde ----------
function runEvent(fn) {
  if (mode !== 'world') return;
  mode = 'event';
  (async () => {
    try { await fn(); }
    catch (e) { console.error(e); }
    finally { mode = 'world'; topScene = 'world'; renderIdle(); }
  })();
}
function sees(n) {
  const [dx, dy] = DIRS[n.dir];
  for (let d = 1; d <= 4; d++) {
    const x = n.x + dx * d, y = n.y + dy * d;
    if (G.x === x && G.y === y) return true;
    if (SOLID.has(tileAt(x, y)) || npcAt(x, y)) return false;
  }
  return false;
}
function stepTo(x, y) { P.fx = G.x; P.fy = G.y; G.x = x; G.y = y; P.moving = true; P.t = 0; P.step = P.step === 1 ? 2 : 1; }
function onStep() {
  const ch = tileAt(G.x, G.y);
  if (ch === 'P' || ch === 'D') return runEvent(() => healEvent(ch));
  const t = NPCS.find(n => n.trainer && !G.flags[n.id] && sees(n));
  if (t) return runEvent(() => trainerBattle(t));
  if (ch === ',' && Math.random() < 0.12) runEvent(wildBattle);
}
let lastBump = 0;
function updateWorld(dt) {
  if (P.moving) {
    P.t += dt / 170;
    if (P.t >= 1) { P.moving = false; P.t = 0; onStep(); }
    return;
  }
  if (mode !== 'world' || dlg || menu) return;
  const d = curDir(); if (!d) return;
  G.dir = d;
  const [dx, dy] = DIRS[d];
  if (walkable(G.x + dx, G.y + dy)) stepTo(G.x + dx, G.y + dy);
  else if (tick - lastBump > 280) { sfx.bump(); lastBump = tick; }
}
function interact() {
  const [dx, dy] = DIRS[G.dir], tx = G.x + dx, ty = G.y + dy;
  const n = npcAt(tx, ty);
  if (n) return runEvent(() => talk(n));
  const it = itemAt(tx, ty);
  if (it) return runEvent(() => pickUp(it));
  const ch = tileAt(tx, ty);
  if (ch === 'S') return runEvent(() => say(SIGNS[`${tx},${ty}`] || '...'));
  if (ch === 'X') return runEvent(() => say(G.flags.champ ? 'L\'Arène. Ton portrait de Champion·ne est accroché à l\'entrée !' : 'Arène de la région. Le Champion Orion en garde l\'entrée.'));
}
async function pickUp(it) {
  G.flags[it.id] = 1;
  G.items[it.item] = (G.items[it.item] || 0) + it.qty;
  sfx.catch(); save(); renderIdle();
  await say(`Tu ramasses l'étincelle... Tu as trouvé ${it.qty > 1 ? it.qty + ' ' : 'une '}${ITEM_NAMES[it.item]} !`);
}
async function talk(n) {
  n.dir = OPP[G.dir];
  if (n.trainer && !G.flags[n.id]) return trainerBattle(n);
  if (n.id === 'prof') {
    if (!G.flags.gift) {
      G.flags.gift = 1; G.items.ball += 5; sfx.catch();
      await say('Prof. Lilas : Tiens, prends ces 5 Balls ! Affaiblis un Monstre sauvage, puis lance une Ball dans le Sac.');
    } else if (G.flags.champ) await say(`Prof. Lilas : ${G.name}, Champion·ne de la région ! Je suis si fier·e de toi !`);
    else await say(pick(TIPS));
  } else await say(`${n.name} : ${n.after}`);
  n.dir = n.hdir;
}
async function healEvent(ch) {
  if (ch === 'P') {
    await say('Bienvenue au Centre Monstre ! Je soigne tes Monstres...');
    healAll(); sfx.heal(); await wait(700);
    if (G.items.ball < 5) { G.items.ball = 5; await say('Voilà, ils sont en pleine forme ! Et tiens : ton stock de Balls est rempli.'); }
    else await say('Voilà, ils sont en pleine forme ! À bientôt !');
  } else {
    await say(`Maman : ${G.name} ! Tu as l'air épuisé·e. Repose-toi un peu...`);
    healAll(); sfx.heal(); await wait(700);
    await say('Maman : Voilà, toute l\'équipe est en forme. Bonne route !');
  }
  save();
  G.dir = 'down'; stepTo(G.x, G.y + 1);
}
function wildFor(x, y) {
  if (y <= 7) return [pick(['fantomi', 'fantomi', 'voltacelle', 'caillouton', 'piouli', 'ratounet']), rand(11, 15)];
  if (y >= 14) return [pick(['ratounet', 'ratounet', 'piouli', 'piouli', 'caillouton', 'feuillon']), rand(2, 4)];
  return [pick(['ratounet', 'piouli', 'voltacelle', 'caillouton', 'voltacelle', 'aquapin', 'flamiaou', 'feuillon']), rand(4, 8)];
}
async function wildBattle() {
  const [id, l] = wildFor(G.x, G.y);
  await battle([makeMon(id, l)], null);
}
async function trainerBattle(n) {
  n.alert = true; sfx.alert(); await wait(800); n.alert = false;
  while (Math.abs(n.x - G.x) + Math.abs(n.y - G.y) > 1) {
    n.x += Math.sign(G.x - n.x); n.y += Math.sign(G.y - n.y); await wait(170);
  }
  G.dir = OPP[n.dir];
  await say(`${n.name} : ${n.intro}`);
  const res = await battle(n.team.map(([id, l]) => makeMon(id, l)), n);
  n.x = n.hx; n.y = n.hy; n.dir = n.hdir;
  if (res === 'win') {
    G.flags[n.id] = 1; save();
    if (n.id === 'champ') await ending();
  }
}
async function ending() {
  sfx.level();
  await say('Orion : Tu es le ou la nouvel·le Champion·ne de la région !');
  await say(`★ FÉLICITATIONS, ${G.name} ! ★`);
  const caught = Object.keys(G.caught).length;
  await say(`Merci d'avoir joué à Lily Quest DS ! Dex : ${caught}/${DEX.length} Monstres capturés. Continue d'explorer pour le compléter !`);
  save();
}

// ---------- Menu du monde ----------
function openMenu(which) {
  if (mode !== 'world' || P.moving) return;
  runEvent(async () => {
    if (!which) which = await choose([
      { value: 'team', label: 'Équipe' }, { value: 'bag', label: 'Sac' },
      { value: 'dex', label: 'Dex' }, { value: 'save', label: 'Sauver' },
      { value: 'title', label: 'Écran titre' },
    ], { cols: 2, title: 'Menu', back: 'back', cls: 'big' });
    if (which === 'team') await teamMenu();
    else if (which === 'bag') await bagMenu();
    else if (which === 'dex') await dexMenu();
    else if (which === 'save') {
      save();
      const ok = await pushCloud(); sfx.heal();
      await say(!account.user ? 'Partie sauvegardée sur cet appareil !' : ok ? 'Partie sauvegardée en ligne !' : 'Sauvegardée sur cet appareil, mais pas en ligne (connexion internet ?).');
    } else if (which === 'title') { save(); await pushCloud(); await titleFlow(); }
  });
}
async function teamMenu() {
  while (true) {
    const i = await chooseMon('Ton équipe', () => true);
    if (i === 'back') return;
    const m = G.team[i];
    const a = await choose([{ value: 'info', label: 'Infos' }, { value: 'lead', label: 'En tête', disabled: i === 0 }],
      { cols: 2, title: `${nm(m)} N${m.lvl}`, back: 'back', cls: 'big' });
    if (a === 'info') {
      const s = stats(m), sp = SPECIES[m.id];
      await say(`${nm(m)} — type ${sp.type}, niveau ${m.lvl}. PV ${m.hp}/${s.hp} · Atq ${s.atk} · Déf ${s.def} · Vit ${s.spd}.`);
      await say(`Attaques : ${m.moves.map(id => MOVES[id].name).join(', ')}. Encore ${xpFor(m.lvl + 1) - m.xp} pts d'exp. avant le niveau ${m.lvl + 1}.`);
    } else if (a === 'lead') {
      G.team.splice(i, 1); G.team.unshift(m); sfx.blip();
    }
  }
}
async function bagMenu() {
  while (true) {
    const it = await choose([
      { value: 'potion', label: `Potion ×${G.items.potion}`, disabled: !G.items.potion },
      { value: 'ball', label: `Ball ×${G.items.ball}`, disabled: !G.items.ball },
    ], { cols: 2, title: 'Sac', back: 'back', cls: 'big' });
    if (it === 'back') return;
    if (it === 'ball') { await say('Ce n\'est pas le moment ! Les Balls s\'utilisent pendant un combat sauvage.'); continue; }
    const i = await chooseMon('Soigner qui ?', m => m.hp > 0 && m.hp < stats(m).hp);
    if (i === 'back') continue;
    const m = G.team[i], before = m.hp;
    m.hp = Math.min(stats(m).hp, m.hp + 20); G.items.potion--; sfx.heal();
    await say(`${nm(m)} récupère ${m.hp - before} PV !`);
  }
}
async function dexMenu() {
  while (true) {
    const seen = Object.keys(G.seen).length, caught = Object.keys(G.caught).length;
    const v = await choose(DEX.map(id => ({
      value: id,
      html: `<img src="${spriteURL(id)}" class="${G.seen[id] ? '' : 'unseen'}" alt=""><span>${G.seen[id] ? (G.caught[id] ? '● ' : '') + SPECIES[id].name : '???'}</span>`,
    })), { cols: 4, title: `Dex · vus ${seen} · pris ${caught}`, back: 'back', cls: 'dex' });
    if (v === 'back') return;
    if (G.seen[v]) await say(`${SPECIES[v].name} (type ${SPECIES[v].type}) : ${SPECIES[v].desc}`);
    else await say('Monstre inconnu... Explore les hautes herbes pour le trouver !');
  }
}

// ---------- Combat ----------
async function transition() {
  sfx.encounter();
  for (let i = 0; i < 6; i++) { overlay = i % 2 ? null : '#ffffff'; await wait(80); }
  overlay = '#000'; await wait(180); overlay = null;
}
async function slide(side, from, to, ms = 400) {
  const s = B[side], n = Math.max(1, Math.round(ms / 16));
  for (let i = 1; i <= n; i++) { s.dx = from + (to - from) * i / n; await wait(16); }
}
async function lunge(side) {
  const s = B[side], d = side === 'm' ? 1 : -1;
  for (let i = 0; i < 4; i++) { s.dx += d * 4; s.dy -= d * 2; await wait(22); }
  for (let i = 0; i < 4; i++) { s.dx -= d * 4; s.dy += d * 2; await wait(22); }
}
async function blink(side) { for (let i = 0; i < 6; i++) { B[side].vis = !B[side].vis; await wait(70); } B[side].vis = true; }
async function faint(side) {
  beep(400, 0.4, 'square', 0.05, -320);
  const s = B[side]; for (let i = 0; i < 20; i++) { s.dy += 3; s.alpha -= 0.05; await wait(20); }
  s.vis = false;
}
async function popIn(side) { const s = B[side]; s.vis = true; s.alpha = 1; s.dy = 0; s.dx = 0; for (let i = 1; i <= 12; i++) { s.scale = i / 12; await wait(20); } }
const hpSynced = () => B.dispE === B.enemy.hp && B.dispM === G.team[B.mi].hp;

async function battle(enemyTeam, trainer) {
  await transition();
  mode = 'battle'; topScene = 'battle';
  const fresh = () => ({ dx: 0, dy: 0, vis: true, alpha: 1, scale: 1 });
  B = { enemyTeam, ei: 0, trainer, enemy: enemyTeam[0], mi: G.team.findIndex(m => m.hp > 0), e: fresh(), m: { ...fresh(), vis: false }, ball: null, evo: null, showE: true, showM: false };
  B.dispE = B.enemy.hp; B.dispM = G.team[B.mi].hp;
  markSeen(B.enemy.id);
  renderIdle();
  await slide('e', 180, 0, 450);
  await say(trainer ? `${trainer.name} veut se battre !` : `Un ${nm(B.enemy)} sauvage apparaît !`);
  if (trainer) await say(`${trainer.name} envoie ${nm(B.enemy)} !`);
  await sendOut(B.mi);

  let res = null;
  while (!res) res = await battleTurn();

  if (res === 'win' && trainer) {
    await say(`Tu as battu ${trainer.name} !`);
    await say(`${trainer.name} : ${trainer.lose}`);
  } else if (res === 'lose') {
    await say('Tu n\'as plus de Monstre en état de se battre...');
    await say('Tu cours au Centre Monstre le plus proche !');
  }
  if (res !== 'lose') {
    for (const m of G.team) { const ev = SPECIES[m.id].evo; if (ev && m.lvl >= ev[0] && m.hp > 0) await evolve(m, ev[1]); }
  }
  overlay = '#000'; await wait(250);
  if (res === 'lose') { healAll(); G.x = 23; G.y = 22; G.dir = 'down'; P.moving = false; }
  B = null; topScene = 'world'; mode = 'event'; overlay = null;
  save(); renderIdle();
  return res;
}
async function sendOut(i) {
  B.mi = i; B.dispM = G.team[i].hp; B.showM = true;
  renderIdle();
  popIn('m'); beep(520, 0.1, 'triangle', 0.07, 300);
  await say(`Go, ${nm(G.team[i])} !`);
}
async function battleTurn() {
  const me = G.team[B.mi];
  renderIdle();
  const act = await choose([
    { value: 'fight', label: 'Attaque', cls: 'act-fight' }, { value: 'bag', label: 'Sac', cls: 'act-bag' },
    { value: 'team', label: 'Équipe', cls: 'act-team' }, { value: 'run', label: 'Fuite', cls: 'act-run' },
  ], { cols: 2, title: `Que doit faire ${nm(me)} ?`, cls: 'big' });

  if (act === 'fight') {
    const mv = await choose(me.moves.map(id => ({ value: id, html: moveHtml(id), cls: 'mv' })), { cols: 2, title: 'Attaques', back: 'back' });
    if (mv === 'back') return null;
    return doTurn(mv);
  }
  if (act === 'bag') {
    const it = await choose([
      { value: 'ball', label: `Ball ×${G.items.ball}`, disabled: !G.items.ball || !!B.trainer },
      { value: 'potion', label: `Potion ×${G.items.potion}`, disabled: !G.items.potion },
    ], { cols: 2, title: B.trainer ? 'Sac (pas de capture en duel !)' : 'Sac', back: 'back', cls: 'big' });
    if (it === 'back') return null;
    if (it === 'ball') { G.items.ball--; if (await throwBall()) return 'caught'; return enemyAct(); }
    const i = await chooseMon('Soigner qui ?', m => m.hp > 0 && m.hp < stats(m).hp);
    if (i === 'back') return null;
    const m = G.team[i], before = m.hp;
    m.hp = Math.min(stats(m).hp, m.hp + 20); G.items.potion--; sfx.heal();
    if (i === B.mi) await until(hpSynced);
    await say(`${nm(m)} récupère ${m.hp - before} PV !`);
    return enemyAct();
  }
  if (act === 'team') {
    const i = await chooseMon('Qui envoyer ?', (m, k) => m.hp > 0 && k !== B.mi);
    if (i === 'back') return null;
    await say(`Reviens, ${nm(me)} !`);
    await slide('m', 0, -120, 250); B.m.vis = false; B.m.dx = 0;
    await sendOut(i);
    return enemyAct();
  }
  // Fuite
  if (B.trainer) { await say('Impossible de fuir un duel de dresseur !'); return null; }
  if (Math.random() < (stats(me).spd >= stats(B.enemy).spd ? 0.9 : 0.55)) { beep(600, 0.2, 'square', 0.05, -400); await say('Tu prends la fuite !'); return 'run'; }
  await say('Impossible de fuir !');
  return enemyAct();
}
function aiMove() {
  const en = B.enemy, target = G.team[B.mi];
  if (Math.random() < 0.4) return pick(en.moves);
  const score = id => { const mv = MOVES[id]; return mv.pow * eff(mv.type, SPECIES[target.id].type) * (mv.type === SPECIES[en.id].type ? 1.5 : 1) * mv.acc / 100; };
  return en.moves.slice().sort((a, b) => score(b) - score(a))[0];
}
async function attack(side, id) {
  const A = side === 'm' ? G.team[B.mi] : B.enemy, D = side === 'm' ? B.enemy : G.team[B.mi], mv = MOVES[id];
  const label = side === 'e' ? `${nm(A)} ${B.trainer ? 'adverse' : 'sauvage'}` : nm(A);
  await say(`${label} utilise ${mv.name} !`);
  if (Math.random() * 100 >= mv.acc) { await say('Mais l\'attaque échoue !'); return false; }
  await lunge(side);
  const e = eff(mv.type, SPECIES[D.id].type);
  if (e === 0) { await say(`Ça n'affecte pas ${nm(D)}...`); return false; }
  const sa = stats(A), sd = stats(D), crit = Math.random() < 1 / 16;
  let dmg = Math.floor(((2 * A.lvl / 5 + 2) * mv.pow * sa.atk / sd.def) / 50 + 2);
  dmg = Math.max(1, Math.floor(dmg * (mv.type === SPECIES[A.id].type ? 1.5 : 1) * e * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15)));
  sfx.hit(); await blink(side === 'm' ? 'e' : 'm');
  D.hp = Math.max(0, D.hp - dmg);
  await until(hpSynced);
  if (crit) await say('Coup critique !');
  if (e > 1) await say('C\'est super efficace !');
  else if (e < 1) await say('Ce n\'est pas très efficace...');
  return D.hp <= 0;
}
async function enemyAct() {
  if (await attack('e', aiMove())) return meFainted();
  return null;
}
async function doTurn(mv) {
  const sm = stats(G.team[B.mi]).spd, se = stats(B.enemy).spd;
  if (sm > se || (sm === se && Math.random() < 0.5)) {
    if (await attack('m', mv)) return enemyFainted();
    return enemyAct();
  }
  if (await attack('e', aiMove())) return meFainted();
  if (await attack('m', mv)) return enemyFainted();
  return null;
}
async function enemyFainted() {
  const en = B.enemy;
  await faint('e');
  await say(`${nm(en)} ${B.trainer ? 'adverse' : 'sauvage'} est K.O. !`);
  const sum = SPECIES[en.id].base.reduce((a, b) => a + b, 0);
  const gain = Math.floor((30 + sum / 6) * en.lvl / 4 * (B.trainer ? 1.5 : 1));
  await giveXp(G.team[B.mi], gain);
  B.ei++;
  if (B.trainer && B.ei < B.enemyTeam.length) {
    B.enemy = B.enemyTeam[B.ei]; B.dispE = B.enemy.hp; markSeen(B.enemy.id);
    Object.assign(B.e, { vis: true, alpha: 1, dy: 0, scale: 1 });
    renderIdle();
    await slide('e', 180, 0, 350);
    await say(`${B.trainer.name} envoie ${nm(B.enemy)} !`);
    return null;
  }
  return 'win';
}
async function meFainted() {
  const me = G.team[B.mi];
  await faint('m');
  await say(`${nm(me)} est K.O. !`);
  if (!G.team.some(m => m.hp > 0)) return 'lose';
  const i = await chooseMon('Qui envoyer ?', m => m.hp > 0, false);
  await sendOut(i);
  return null;
}
async function giveXp(m, x) {
  await say(`${nm(m)} gagne ${x} points d'expérience !`);
  m.xp += x;
  while (m.lvl < 50 && m.xp >= xpFor(m.lvl + 1)) {
    const old = stats(m); m.lvl++; const s = stats(m);
    m.hp = Math.min(s.hp, m.hp + s.hp - old.hp);
    if (G.team[B.mi] === m) B.dispM = m.hp;
    sfx.level();
    await say(`${nm(m)} monte au niveau ${m.lvl} !`);
    for (const [l, mv] of SPECIES[m.id].learn) if (l === m.lvl) await learnMove(m, mv);
  }
}
async function learnMove(m, mv) {
  if (m.moves.includes(mv)) return;
  if (m.moves.length < 4) { m.moves.push(mv); sfx.level(); return say(`${nm(m)} apprend ${MOVES[mv].name} !`); }
  await say(`${nm(m)} veut apprendre ${MOVES[mv].name}, mais connaît déjà 4 attaques.`);
  const c = await choose([...m.moves.map((id, i) => ({ value: i, html: moveHtml(id), cls: 'mv' })), { value: -1, label: 'Ne pas apprendre' }],
    { cols: 2, title: 'Oublier quelle attaque ?' });
  if (c < 0) return say(`${nm(m)} n'apprend pas ${MOVES[mv].name}.`);
  const old = m.moves[c]; m.moves[c] = mv;
  await say(`1, 2, 3... Pouf ! ${nm(m)} oublie ${MOVES[old].name} et apprend ${MOVES[mv].name} !`);
}
async function throwBall() {
  const en = B.enemy;
  beep(700, 0.15, 'triangle', 0.06, 400);
  const from = [50, 120], to = [192, 40];
  B.ball = { x: from[0], y: from[1], rot: 0 };
  for (let i = 1; i <= 26; i++) {
    const t = i / 26; B.ball.x = from[0] + (to[0] - from[0]) * t; B.ball.y = from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * 50; B.ball.rot = t * 12;
    await wait(16);
  }
  B.e.white = true; await wait(120);
  for (let i = 1; i <= 8; i++) { B.e.scale = 1 - i / 8; await wait(20); }
  B.e.vis = false; B.e.white = false;
  for (let i = 1; i <= 10; i++) { B.ball.y = 40 + i * 2.6; await wait(20); }
  B.ball.rot = 0;
  const s = stats(en), p = Math.min(0.95, SPECIES[en.id].rate * 1.5 * (1 - 0.7 * en.hp / s.hp));
  const pass = Math.cbrt(p);
  for (let k = 0; k < 3; k++) {
    await wait(450);
    if (Math.random() > pass) {
      beep(200, 0.2, 'square', 0.06, 300);
      B.ball = null; B.e.vis = true; B.e.scale = 1;
      await say(pick(['Oh non ! Il s\'est libéré !', 'Raaah ! C\'était presque ça !', 'Zut ! Presque !']));
      return false;
    }
    sfx.shake();
    for (const r of [-0.5, 0.5, 0]) { B.ball.rot = r; await wait(70); }
  }
  sfx.catch(); B.ball.caught = true; await wait(300);
  const name = nm(en);
  G.caught[en.id] = 1;
  await say(`Et hop ! ${name} est capturé !`);
  if (G.team.length < 6) { G.team.push(en); await say(`${name} rejoint ton équipe !`); }
  else { G.box.push(en); await say(`Ton équipe est pleine : ${name} est envoyé au PC.`); }
  return true;
}
async function evolve(m, to) {
  const from = m.id;
  B.evo = { show: from, white: false, glow: 0 };
  await say(`Quoi ? ${nm(m)} évolue !`);
  for (let i = 0; i < 16; i++) { B.evo.show = i % 2 ? to : from; B.evo.white = true; beep(400 + i * 40, 0.06, 'triangle', 0.05); await wait(Math.max(70, 320 - i * 18)); }
  const old = stats(m), oldName = nm(m);
  m.id = to; const s = stats(m); m.hp = Math.min(s.hp, m.hp + s.hp - old.hp);
  B.evo.show = to; B.evo.white = false; markSeen(to); G.caught[to] = 1;
  sfx.level();
  await say(`Félicitations ! ${oldName} a évolué en ${nm(m)} !`);
  for (const [l, mv] of SPECIES[to].learn) if (l === m.lvl) await learnMove(m, mv);
  B.evo = null;
}

// ---------- Dessin des scènes ----------
function drawDialog(g) {
  if (!dlg) return;
  g.fillStyle = '#2c3a70'; g.fillRect(3, 145, 250, 45);
  g.fillStyle = '#c8d8f8'; g.fillRect(5, 147, 246, 41);
  g.fillStyle = '#ffffff'; g.fillRect(6, 148, 244, 39);
  let left = Math.floor(dlg.shown);
  dlg.lines.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length; txt(g, part, 12, 153 + i * 11); });
  if (dlg.shown >= dlgLen() && Math.floor(tick / 300) % 2) poly(g, [238, 179, 246, 179, 242, 184], '#d03848');
}
function drawWorld(g) {
  const px = P.moving ? P.fx + (G.x - P.fx) * P.t : G.x, py = P.moving ? P.fy + (G.y - P.fy) * P.t : G.y;
  const camX = clamp(Math.round(px * 16 + 8 - 128), 0, MW * 16 - 256), camY = clamp(Math.round(py * 16 + 8 - 96), 0, MH * 16 - 192);
  g.drawImage(mapFrames[Math.floor(tick / 500) % 2], camX, camY, 256, 192, 0, 0, 256, 192);
  for (const it of ITEMS) if (!G.flags[it.id]) drawSparkle(g, it.x * 16 - camX, it.y * 16 - camY);
  const ents = NPCS.map(n => ({ y: n.y, draw: () => drawPerson(g, n.x * 16 - camX, n.y * 16 - camY - 3, n.dir, 0, n.colors) }));
  const step = P.moving && P.t > 0.2 && P.t < 0.8 ? P.step : 0;
  ents.push({ y: py, draw: () => drawPerson(g, Math.round(px * 16) - camX, Math.round(py * 16) - camY - 3, G.dir, step, HERO) });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  // Les hautes herbes cachent les pieds
  const gx = Math.round(px), gy = Math.round(py);
  if (tileAt(gx, gy) === ',' && (!P.moving || P.t > 0.5)) g.drawImage(mapFrames[0], gx * 16, gy * 16 + 9, 16, 7, gx * 16 - camX, gy * 16 - camY + 9, 16, 7);
  for (const n of NPCS) if (n.alert) {
    const x = n.x * 16 - camX + 3, y = n.y * 16 - camY - 16;
    g.fillStyle = '#222'; g.fillRect(x - 1, y - 1, 12, 13); g.fillStyle = '#fff'; g.fillRect(x, y, 10, 11);
    txt(g, '!', x + 2, y + 2, '#e03848');
  }
}
function drawSparkle(g, x, y) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
  const big = Math.floor(tick / 300) % 2, phase = Math.floor(tick / 250) % 3;
  r(4, 13, 8, 2, 'rgba(0,0,0,.15)');
  r(7, 2 - big, 2, 12 + big * 2, '#ffc53a'); r(2 - big, 7, 12 + big * 2, 2, '#ffc53a');
  r(6, 5, 4, 6, '#ffe680'); r(5, 6, 6, 4, '#ffe680'); r(7, 6, 2, 4, '#ffffff'); r(6, 7, 4, 2, '#ffffff');
  if (phase === 0) { r(2, 2, 1, 1, '#ffffff'); r(13, 12, 1, 1, '#ffffff'); }
  else if (phase === 1) { r(13, 3, 1, 1, '#ffffff'); r(2, 12, 1, 1, '#ffffff'); }
}
function drawBall(g, x, y, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  ell(g, 0, 0, 6, 6, '#222'); g.fillStyle = '#e83848'; g.beginPath(); g.arc(0, 0, 5, Math.PI, 0); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI); g.fill();
  g.fillStyle = '#222'; g.fillRect(-5, -1, 10, 2); ell(g, 0, 0, 2, 2, '#222'); ell(g, 0, 0, 1, 1, '#fff');
  g.restore();
}
function hpBox(g, x, y, w, m, disp, me) {
  const s = stats(m), p = clamp(disp / s.hp * 100, 0, 100), h = me ? 38 : 26;
  g.fillStyle = '#2c3a50'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#f8f8e8'; g.fillRect(x, y, w, h);
  g.fillStyle = '#e8e4c8'; g.fillRect(x, y + h - 3, w, 3);
  txt(g, nm(m), x + 4, y + 4); txt(g, `N${m.lvl}`, x + w - 4, y + 4, '#202838', 'right');
  txt(g, 'PV', x + 4, y + 15, '#e0a020', 'left');
  g.fillStyle = '#404850'; g.fillRect(x + 22, y + 15, w - 28, 7);
  g.fillStyle = '#1a1a20'; g.fillRect(x + 23, y + 16, w - 30, 5);
  g.fillStyle = hpColor(p); g.fillRect(x + 23, y + 16, Math.ceil((w - 30) * p / 100), 5);
  if (me) {
    txt(g, `${Math.ceil(disp)}/${s.hp}`, x + w - 4, y + 25, '#202838', 'right');
    const a = xpFor(m.lvl), b = xpFor(m.lvl + 1), xp = clamp((m.xp - a) / (b - a), 0, 1);
    g.fillStyle = '#404850'; g.fillRect(x + 4, y + h - 4, w - 8, 3);
    g.fillStyle = '#48a8f8'; g.fillRect(x + 4, y + h - 4, Math.floor((w - 8) * xp), 3);
  }
}
function drawBattle(g) {
  if (B.evo) {
    g.fillStyle = '#10081c'; g.fillRect(0, 0, 256, 192);
    for (let i = 0; i < 12; i++) {
      const a = tick / 900 + i * Math.PI / 6;
      poly(g, [128, 70, 128 + Math.cos(a) * 220, 70 + Math.sin(a) * 220, 128 + Math.cos(a + 0.25) * 220, 70 + Math.sin(a + 0.25) * 220], i % 2 ? 'rgba(255,220,120,.12)' : 'rgba(180,140,255,.12)');
    }
    drawMon(g, B.evo.show, 88, 26, { white: B.evo.white && Math.floor(tick / 60) % 2 === 0 });
    drawDialog(g);
    return;
  }
  const sky = g.createLinearGradient(0, 0, 0, 192);
  sky.addColorStop(0, '#8fd0ff'); sky.addColorStop(0.48, '#e6f6ff'); sky.addColorStop(0.48, '#b4e088'); sky.addColorStop(1, '#78c058');
  g.fillStyle = sky; g.fillRect(0, 0, 256, 192);
  ell(g, 40 + (tick / 80) % 300 - 40, 22, 18, 6, 'rgba(255,255,255,.9)');
  ell(g, 200 - (tick / 120) % 300 + 60, 38, 14, 5, 'rgba(255,255,255,.8)');
  ell(g, 192, 79, 48, 11, '#5ea844'); ell(g, 192, 78, 44, 9, '#8ad468');
  ell(g, 64, 137, 56, 13, '#5ea844'); ell(g, 64, 136, 52, 11, '#8ad468');
  const e = B.e, m = B.m;
  if (e.vis) drawMon(g, B.enemy.id, 152 + e.dx, 2 + e.dy, { alpha: e.alpha, scale: e.scale, white: e.white });
  if (m.vis && B.showM) drawMon(g, G.team[B.mi].id, 24 + m.dx, 58 + m.dy, { flip: true, alpha: m.alpha, scale: m.scale });
  if (B.ball) {
    drawBall(g, B.ball.x, B.ball.y, B.ball.rot);
    if (B.ball.caught) for (let i = 0; i < 3; i++) txt(g, '*', B.ball.x - 14 + i * 12, B.ball.y - 18 - (i % 2) * 5, '#ffd23f');
  }
  if (B.showE) hpBox(g, 6, 8, 124, B.enemy, B.dispE, false);
  if (B.showM) hpBox(g, 128, 96, 122, G.team[B.mi], B.dispM, true);
  drawDialog(g);
}
function drawTitle(g) {
  const bg = g.createLinearGradient(0, 0, 0, 192);
  bg.addColorStop(0, '#ff9ec8'); bg.addColorStop(1, '#7aa8ff');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 192);
  for (let i = 0; i < 18; i++) {
    const x = (i * 53 + tick / 30) % 270 - 7, y = (i * 37) % 190;
    if ((i + Math.floor(tick / 400)) % 3) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x, y, 2, 2); }
  }
  txt(g, 'LILY QUEST', 131, 23, '#5a2050', 'center', 16);
  txt(g, 'LILY QUEST', 128, 20, '#ffffff', 'center', 16);
  g.fillStyle = '#e03848'; g.fillRect(96, 44, 64, 14); txt(g, 'VERSION DS', 128, 47, '#fff', 'center');
  ['flamiaou', 'aquapin', 'feuillon'].forEach((id, i) => drawMon(g, id, 12 + i * 80, 66 + Math.sin(tick / 250 + i * 2) * 4));
  if (Math.floor(tick / 500) % 2 && !dlg) txt(g, 'Touche A ou l\'écran', 128, 162, '#ffffff', 'center');
  drawDialog(g);
}
function drawIntro(g) {
  const bg = g.createLinearGradient(0, 0, 0, 192);
  bg.addColorStop(0, '#fff1d6'); bg.addColorStop(1, '#ffc2d8');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 192);
  ell(g, 128, 130, 70, 12, 'rgba(0,0,0,.08)');
  if (introPick) drawMon(g, introPick, 88, 50 + Math.sin(tick / 200) * 3);
  else g.drawImage(personCanvas('prof', NPCS[0].colors), 0, 0, 16, 16, 88, 50, 80, 80);
  drawDialog(g);
}
function render() {
  const g = ctx;
  g.clearRect(0, 0, 256, 192);
  if (topScene === 'title') drawTitle(g);
  else if (topScene === 'intro') drawIntro(g);
  else if (topScene === 'battle' && B) drawBattle(g);
  else if (G) { drawWorld(g); drawDialog(g); }
  if (overlay) { g.fillStyle = overlay; g.fillRect(0, 0, 256, 192); }
  if (toast && tick < toast.until) {
    g.font = FONT; const w = Math.ceil(g.measureText(toast.text).width) + 16;
    g.fillStyle = '#2c3a70'; g.fillRect(128 - w / 2 - 1, 5, w + 2, 18);
    g.fillStyle = '#ffffff'; g.fillRect(128 - w / 2, 6, w, 16);
    txt(g, toast.text, 128, 10, '#2c3a70', 'center');
  }
}

// ---------- Boucle ----------
let last = performance.now();
function loop(t) {
  const dt = Math.min(50, t - last); last = t; tick += dt;
  if (dlg && dlg.shown < dlgLen()) dlg.shown += dt * 0.06;
  if (B) {
    const sp = s => s.hp * dt / 700;
    if (B.enemy) B.dispE = approach(B.dispE, B.enemy.hp, sp(stats(B.enemy)));
    const me = G.team[B.mi]; if (me) B.dispM = approach(B.dispM, me.hp, sp(stats(me)));
  }
  if (G && topScene === 'world') updateWorld(dt);
  bottom.classList.toggle('talking', !!dlg && !menu);
  updateMusic(topScene === 'battle' ? 'battle' : topScene === 'world' ? 'world' : 'title');
  render();
  requestAnimationFrame(loop);
}

// ---------- Commandes ----------
let dirOrder = [];
const curDir = () => dirOrder[dirOrder.length - 1];
function pressDir(d) {
  if (!dirOrder.includes(d)) dirOrder.push(d);
  if (menu && !dlg) menuNav(d);
}
function releaseDir(d) { dirOrder = dirOrder.filter(x => x !== d); }
function pressA() {
  if (dlg) return dlgAdvance();
  if (menu) return menuPick(menu.sel);
  if (mode === 'world' && !P.moving) interact();
}
function pressB() {
  if (dlg) return dlgAdvance();
  if (menu && menu.back !== undefined) menuPick('back');
}
function pressMenu() { if (mode === 'world') openMenu(); }
let toast = null;
function toggleSound() {
  unlockAudio();
  soundOn = !soundOn;
  try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch (e) { /* stockage bloqué */ }
  toast = { text: soundOn ? '♪ Son activé' : 'Son coupé', until: tick + 1500 };
  if (soundOn) sfx.blip();
  if (topScene === 'world' && !menu) renderIdle();
}

const KEY_DIRS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const d = KEY_DIRS[e.code];
  if (d) { e.preventDefault(); if (!e.repeat) pressDir(d); return; }
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (e.key === ' ' || e.key === 'Enter' || k === 'k') { e.preventDefault(); pressA(); }
  else if (e.key === 'Escape' || k === 'x' || k === 'l') pressB();
  else if (k === 'm') pressMenu();
  else if (k === 'n') toggleSound();
});
addEventListener('keyup', e => { const d = KEY_DIRS[e.code]; if (d) releaseDir(d); });
addEventListener('blur', () => { dirOrder = []; });

document.querySelectorAll('#dpad [data-dir]').forEach(b => {
  const d = b.dataset.dir;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on'); pressDir(d); });
  const up = () => { b.classList.remove('on'); releaseDir(d); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, up));
});
const tapBtn = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
tapBtn('#btnA', pressA); tapBtn('#btnB', pressB); tapBtn('#btnX', pressMenu); tapBtn('#btnY', toggleSound);
tapBtn('#btnStart', pressMenu); tapBtn('#btnSelect', toggleSound);
topCv.addEventListener('pointerdown', e => { e.preventDefault(); if (dlg) dlgAdvance(); else if (menu && topScene === 'title') menuPick(menu.sel); });
bottom.addEventListener('click', () => { if (dlg && !menu) dlgAdvance(); });

// ---------- Début de partie ----------
async function titleFlow() {
  mode = 'event'; topScene = 'title'; G = null; B = null;
  // Reprend la session de cet appareil, et vérifie au passage que le serveur de comptes répond
  if (!account.user && !account.offline) {
    account.token = store.get(TOKEN_KEY);
    try { const d = await api('auth', { body: { action: 'me' } }); setAccount(d.username, account.token); }
    catch (e) { if (serverDown(e)) account.offline = true; setAccount(null, null); }
  }
  if (!account.user && !account.offline && !(await loginPanel())) account.offline = true;

  let saved;
  try { saved = await loadBestSave(); }
  catch (e) {
    if (e.status === 401) { setAccount(null, null); return titleFlow(); }
    saved = loadSave();
  }
  const opts = [{ value: 'new', label: 'Nouvelle partie' }];
  if (saved) opts.unshift({ value: 'cont', label: `Continuer (${saved.name})` });
  opts.push({ value: 'account', label: account.user ? `Se déconnecter (${account.user})` : 'Se connecter' });
  const v = await choose(opts, { title: account.user ? `★ LILY QUEST DS ★ ☁ ${esc(account.user)}` : '★ LILY QUEST DS ★ · hors ligne', cls: 'big' });
  if (v === 'account') {
    if (account.user) { try { await api('auth', { body: { action: 'logout' } }); } catch (e) { /* déjà déconnecté */ } setAccount(null, null); }
    account.offline = false;
    return titleFlow();
  }
  if (v === 'new' && saved) {
    const ok = await choose([{ value: false, label: 'Non' }, { value: true, label: 'Oui, effacer' }], { cols: 2, title: 'Effacer la sauvegarde ?', cls: 'big' });
    if (!ok) return titleFlow();
  }
  if (v === 'cont') {
    G = saved;
    G.box ||= []; G.flags ||= {}; G.seen ||= {}; G.caught ||= {};
    topScene = 'world'; save(); renderIdle();
    await say(`Bon retour, ${G.name} !`);
  } else await newGame();
  mode = 'world'; renderIdle();
}
async function newGame() {
  topScene = 'intro'; renderIdle();
  await say('Bonjour ! Je suis le Prof. Lilas. Bienvenue dans le monde des Monstres !');
  await say('Ici, humains et Monstres vivent ensemble. Certains les collectionnent, d\'autres les font combattre.');
  await say('Mais dis-moi... comment t\'appelles-tu ?');
  const name = await askName();
  renderIdle();
  await say(`${name} ! Quel joli prénom !`);
  await say('Je vais te confier ton tout premier Monstre. Choisis bien !');
  let starter = null;
  while (!starter) {
    const s = await choose(['flamiaou', 'aquapin', 'feuillon'].map(id => ({
      value: id, cls: 'starter',
      html: `<img src="${spriteURL(id)}" alt=""><span>${SPECIES[id].name}</span><span class="type" style="background:${TYPES[SPECIES[id].type]}">${SPECIES[id].type}</span>`,
    })), { cols: 3, title: 'Choisis ton partenaire' });
    introPick = s;
    await say(`${SPECIES[s].name}, le Monstre de type ${SPECIES[s].type}. ${SPECIES[s].desc}`);
    const ok = await choose([{ value: true, label: 'Oui !' }, { value: false, label: 'Non' }], { cols: 2, title: `Choisir ${SPECIES[s].name} ?`, cls: 'big' });
    if (ok) starter = s;
    else introPick = null;
  }
  G = { name, x: 5, y: 22, dir: 'down', team: [makeMon(starter, 5)], box: [], items: { ball: 5, potion: 3 }, flags: {}, seen: { [starter]: 1 }, caught: { [starter]: 1 } };
  sfx.catch();
  await say(`Tu reçois ${SPECIES[starter].name} ! Prends-en bien soin.`);
  await say('Le Champion Orion t\'attend tout au nord. Passe me voir près de chez toi, j\'ai un cadeau !');
  introPick = null; topScene = 'world'; save(); renderIdle();
  await say('Astuce : touche M ou le bouton X pour le menu. La porte bleue, c\'est le Centre de soin. Bonne aventure !');
}

// Lancement (on attend la police pixel pour mesurer les textes correctement)
(async () => {
  try { await Promise.race([document.fonts.load(FONT), wait(2500)]); } catch (e) { /* police indisponible */ }
  requestAnimationFrame(loop);
  titleFlow();
})();
