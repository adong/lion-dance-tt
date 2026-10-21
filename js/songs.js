/* TT Lion Dance: the three festival songs, their charts and the lion's route over the plum-blossom poles.
   Pure data and maths (no page, no sound), so node can check it (tools/check.js).

   Song time is seconds from the first beat of bar 1; the count-in plays the bar before (negative times).
   A bar has 8 slots (eighth notes): d = big drum 🥁 (the head's beat), c = cymbal (the tail's beat), g = gong
   (both: the big moments). Every chart note sits on a slot, and the music plays a drum, cymbal or gong under it.
   🐣 EASY uses only beats (slots 0 2 4 6) and is always a subset of 🔥 NORMAL, note for note.

   The story of every song, in sections of bars:
     wake   the lion sleeps; the first gong wakes it (eyes open), then it blinks (drum) and shakes (cymbal)
     walk   it dances forward to the poles, a step on every beat
     poles  one pole every 2 bars: the gong on the bar's first beat is the leap, landing one beat later on a drum
     green  gong: it rears up for the green, cymbal: it plucks it (采青); next gong: it spits the leaves for luck
     end    a last flourish, and a final gong for the bow
   The lion's moves happen on the music's time whether or not a note was hit, so it never gets stuck and 🐣 EASY
   always reaches the green; hits make the moves bigger and sparkle, misses make it wobble. */
(function () {
  'use strict';
  const LD = (window.LD = window.LD || {});

  // [NORMAL, EASY] bar patterns. Picked in turn (with a per-song offset), always as a pair, so EASY ⊂ NORMAL.
  const PAT = {
    wakeFirst: [['g...d.c.', 'g.......']],
    wake: [
      ['d.d.c...', 'd...c...'],
      ['d.d.c.c.', 'd...c...'],
      ['c.c.d.d.', 'c...d...'],
      ['d.c.c.d.', 'd...c...'],
    ],
    walk: [
      ['d.d.c.c.', 'd...c...'],
      ['d.d.d.c.', 'd...d...'],
      ['c.d.c.d.', 'c...c...'],
      ['d.dcd.c.', 'd...d...'],
    ],
    poleA: [ // slot 0: the leap (gong), slot 1 empty while flying, slot 2: the landing (drum)
      ['g.d.c.c.', 'g...c...'],
      ['g.d.d.c.', 'g...d...'],
      ['g.d.c.d.', 'g...c...'],
    ],
    poleB: [
      ['d.d.c...', 'd...c...'],
      ['c.d.c.d.', 'c...c...'],
      ['d.c.d.c.', 'd...d...'],
    ],
    greenA: [['g...c.d.', 'g...c...']], // gong: rear up (2 beats), cymbal on beat 3: pluck the green
    greenB: [['g.d.d.c.', 'g.......']], // gong: spit the lettuce leaves for good luck
    endA: [['d.d.c.c.', 'd...c...']],
    endB: [['g.......', 'g.......']], // the bow
  };

  // Melodies: 8 bars that loop, 8 tokens a bar. Scale degrees 1-7 (these are pentatonic: 1 2 3 5 6), ' = up an
  // octave, , = down, - = hold, . = rest. Our own tunes. roots = the bass note's degree for each of the 8 bars.
  const SONGS = [
    {
      id: 'lantern', emoji: '🏮', name: 'LANTERN WALK', bpm: 90, tonic: 67, lead: 'flute', offset: 0,
      poles: [1.2, 1.8, 2.5, 3.1], walk: 4,
      roots: [1, 1, 5, 5, 1, 6, 5, 1],
      melody: [
        '3 - 5 - 6 1\' 6 5', '3 - 2 - 1 - - -', '2 - 3 - 5 6 5 3', '2 - - - . . . .',
        '3 - 5 - 6 1\' 6 5', '6 - 1\' - 2\' - 1\' 6', '5 - 3 5 2 3 2 1', '1 - - - . . . .',
      ],
    },
    {
      id: 'plum', emoji: '🌸', name: 'PLUM BLOSSOM POLES', bpm: 104, tonic: 74, lead: 'sheng', offset: 1,
      poles: [1.2, 2.0, 1.6, 2.6, 3.2], walk: 4,
      roots: [1, 1, 6, 6, 1, 5, 5, 1],
      melody: [
        '1 - 2 3 5 - 6 5', '3 2 1 2 3 - - -', '5 - 6 1\' 6 5 3 5', '6 - - - 5 - - -',
        '1\' - 6 5 3 - 5 6', '5 3 2 3 5 - - -', '2 3 5 3 2 1 6, 1', '1 - - - . . . .',
      ],
    },
    {
      id: 'envelope', emoji: '🧧', name: 'RED ENVELOPE RUSH', bpm: 120, tonic: 72, lead: 'suona', offset: 2,
      poles: [1.2, 1.8, 2.6, 2.0, 3.0, 3.6], walk: 6,
      roots: [1, 1, 1, 1, 6, 6, 5, 1],
      melody: [
        '5 5 6 5 1\' - 6 5', '3 5 6 - 5 - - -', '3 3 5 3 2 - 1 2', '3 - 5 - 3 - - -',
        '6 6 1\' 6 5 - 3 5', '6 - 5 - 3 - - -', '2 3 5 6 5 3 2 3', '1 - - - 1 - - -',
      ],
    },
  ];

  const LEVELS = {
    easy: { id: 'easy', windows: { perfect: 0.075, great: 0.14, ok: 0.21 }, canFail: false, grid: 2 },
    normal: { id: 'normal', windows: { perfect: 0.045, great: 0.09, ok: 0.135 }, canFail: true, grid: 1 },
  };

  const POLE_X0 = 7.6, POLE_GAP = 3.4, WALK_FROM = 0;
  const DEG = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // The section plan: [type, bars] in order.
  const plan = (def) => [['wake', 4], ['walk', def.walk], ['poles', def.poles.length * 2], ['green', 2], ['end', 2]];

  // Which [NORMAL, EASY] pair a bar uses.
  function barPattern(def, type, b, poleI) {
    const o = def.offset;
    const at = (list, i) => list[((i % list.length) + list.length) % list.length];
    if (type === 'wake') return b === 0 ? PAT.wakeFirst[0] : at(PAT.wake, b - 1 + o);
    if (type === 'walk') return at(PAT.walk, b + o);
    if (type === 'poles') return b % 2 === 0 ? at(PAT.poleA, poleI + o) : at(PAT.poleB, poleI + o);
    if (type === 'green') return b === 0 ? PAT.greenA[0] : PAT.greenB[0];
    return b === 0 ? PAT.endA[0] : PAT.endB[0];
  }

  function build(def) {
    const spb = 60 / def.bpm, bar = spb * 4, slot = spb / 2;
    const sections = [];
    const charts = { easy: [], normal: [] };
    const events = [];
    let barNo = 0;
    for (const [type, n] of plan(def)) {
      sections.push({ type, from: barNo * bar, to: (barNo + n) * bar, bar0: barNo, bars: n });
      for (let b = 0; b < n; b++) {
        const poleI = type === 'poles' ? b >> 1 : -1;
        const [pn, pe] = barPattern(def, type, b, poleI);
        for (let s = 0; s < 8; s++) {
          const t = (barNo + b) * bar + s * slot;
          const role = moment(type, b, s);
          if (pn[s] !== '.') charts.normal.push({ t, inst: pn[s], bar: barNo + b, slot: s, sec: type, role, pole: poleI });
          if (pe[s] !== '.') charts.easy.push({ t, inst: pe[s], bar: barNo + b, slot: s, sec: type, role, pole: poleI });
          // the music under the notes: NORMAL's hits (EASY's are among them)
          if (pn[s] !== '.') events.push({ t, kind: pn[s], accent: s === 0 });
        }
        // the drum roll before each leap, the pick-up step in the walk, a soft woodblock on every beat
        const t0 = (barNo + b) * bar;
        if (type === 'poles' && b % 2 === 1) for (let k = 0; k < 4; k++) events.push({ t: t0 + 6 * slot + k * slot / 2, kind: 'r', vol: 0.35 + k * 0.15 });
        if (type === 'walk') events.push({ t: t0 + 7 * slot, kind: 'r', vol: 0.4 });
        for (let s = 0; s < 8; s += 2) events.push({ t: t0 + s * slot, kind: 'w', accent: s === 0 });
      }
      barNo += n;
    }
    const bars = barNo;
    // count-in: four woodblocks in the bar before the song
    for (let k = 0; k < 4; k++) events.push({ t: -bar + k * spb, kind: 'w', count: k + 1, accent: true });

    // melody, bass and plucked strings (a guzheng-ish sparkle in the walk and on the poles)
    const lead = def.tonic, bassM = (def.tonic % 12) + 36;
    for (let b = 0; b < bars; b++) {
      const t0 = b * bar, ph = b % 8, last = b === bars - 1;
      const root = def.roots[ph];
      const rootM = bassM + DEG[root];
      if (last) {
        events.push({ t: t0, kind: 'bass', f: hz(bassM), dur: bar });
        events.push({ t: t0, kind: 'lead', f: hz(lead), dur: bar * 0.9 });
        events.push({ t: t0, kind: 'pad', fs: [0, 7, 12].map((x) => hz(lead - 12 + x)), dur: bar });
        continue;
      }
      events.push({ t: t0, kind: 'bass', f: hz(rootM), dur: spb * 1.8 });
      events.push({ t: t0 + 2 * spb, kind: 'bass', f: hz(rootM + 7), dur: spb * 1.6 });
      const sec = sections.find((s) => b >= s.bar0 && b < s.bar0 + s.bars).type;
      if (sec === 'walk' || sec === 'poles' || sec === 'green') {
        [0, 7, 12, 7].forEach((x, k) => events.push({ t: t0 + (2 * k + 1) * slot, kind: 'pluck', f: hz(rootM + 24 + x), dur: slot }));
      }
      const toks = def.melody[ph].trim().split(/\s+/);
      for (let s = 0; s < 8; s++) {
        const tok = toks[s];
        if (tok === '-' || tok === '.') continue;
        let len = 1;
        while (s + len < 8 && toks[s + len] === '-') len++;
        const d = +tok[0];
        const oct = (tok.match(/'/g) || []).length - (tok.match(/,/g) || []).length;
        events.push({ t: t0 + s * slot, kind: 'lead', f: hz(lead + DEG[d] + 12 * oct), dur: len * slot });
      }
    }
    events.sort((a, b) => a.t - b.t);
    for (const k of ['easy', 'normal']) charts[k].sort((a, b) => a.t - b.t);

    const song = { def, id: def.id, bpm: def.bpm, spb, bar, slot, bars, sections, charts, events, length: bars * bar + spb };
    song.route = route(song);
    return song;
  }

  // What a note at this place does in the story.
  function moment(type, b, s) {
    if (type === 'wake' && b === 0 && s === 0) return 'wake';
    if (type === 'poles' && b % 2 === 0 && s === 0) return 'leap';
    if (type === 'poles' && b % 2 === 0 && s === 2) return 'land';
    if (type === 'green' && b === 0 && s === 0) return 'reach';
    if (type === 'green' && b === 0 && s === 4) return 'pluck';
    if (type === 'green' && b === 1 && s === 0) return 'spit';
    if (type === 'end' && b === 1 && s === 0) return 'bow';
    return null;
  }

  // ------------------------------------------------------------------ the route
  // Pieces in time order: stand (sleeping, waking), walk (one step a beat), leap (gong -> one beat later), stand on
  // a pole. x is along the street (the lion faces +x), y is the height of its feet.
  const poleX = (i) => POLE_X0 + i * POLE_GAP;
  function route(song) {
    const { spb, sections, def } = song;
    const sec = (type) => sections.find((s) => s.type === type);
    const walk = sec('walk'), poles = sec('poles');
    const xWalkEnd = poleX(0) - 2.9;
    const parts = [];
    parts.push({ kind: 'stand', t0: -Infinity, t1: walk.from, x0: WALK_FROM, y0: 0, x1: WALK_FROM, y1: 0, pole: -1 });
    parts.push({ kind: 'walk', t0: walk.from, t1: walk.to, x0: WALK_FROM, y0: 0, x1: xWalkEnd, y1: 0, pole: -1, steps: Math.round((walk.to - walk.from) / spb) });
    let x = xWalkEnd, y = 0, t = walk.to;
    const leaps = song.charts.normal.filter((n) => n.role === 'leap');
    leaps.forEach((n, i) => {
      if (n.t > t) parts.push({ kind: 'stand', t0: t, t1: n.t, x0: x, y0: y, x1: x, y1: y, pole: i - 1 });
      const x1 = poleX(i), y1 = def.poles[i];
      parts.push({ kind: 'leap', t0: n.t, t1: n.t + spb, x0: x, y0: y, x1, y1, pole: i, h: 1.1 + Math.abs(y1 - y) * 0.35 });
      x = x1; y = y1; t = n.t + spb;
    });
    parts.push({ kind: 'stand', t0: t, t1: Infinity, x0: x, y0: y, x1: x, y1: y, pole: leaps.length - 1 });
    const greenX = x, greenY = y;
    return { parts, poles: def.poles.map((h, i) => ({ x: poleX(i), h })), green: { x: greenX + 0.9, y: greenY + 4.3 }, start: WALK_FROM };
  }

  const smooth = (u) => u * u * (3 - 2 * u);
  // Where the lion is at song time t: { x, y, kind, pole, u (0..1 through the piece), air }
  function posAt(song, t) {
    const parts = song.route.parts;
    let p = parts[parts.length - 1];
    for (const q of parts) if (t >= q.t0 && t < q.t1) { p = q; break; }
    if (p.kind === 'walk') {
      const b = (t - p.t0) / song.spb;
      const n = p.steps;
      const f = (Math.min(n, Math.floor(b)) + (b >= n ? 0 : smooth(Math.min(1, (b % 1) * 2)))) / n;
      return { x: p.x0 + (p.x1 - p.x0) * f, y: 0, kind: 'walk', pole: -1, u: b % 1, air: 0 };
    }
    if (p.kind === 'leap') {
      const u = (t - p.t0) / (p.t1 - p.t0);
      const e = u; // even speed along x looks like a real jump; the arc gives the hang time
      return { x: p.x0 + (p.x1 - p.x0) * e, y: p.y0 + (p.y1 - p.y0) * u + p.h * 4 * u * (1 - u), kind: 'leap', pole: p.pole, u, air: Math.sin(u * Math.PI) };
    }
    return { x: p.x0, y: p.y0, kind: 'stand', pole: p.pole, u: 0, air: 0 };
  }

  // The notes one player plays. role: 'both' (1 player), 'head' (drum + gong) or 'tail' (cymbal + gong).
  // lanes: the pads left to right. A gong with no pad of its own (🐣 EASY) can be hit with any pad: lane -1.
  function lanesFor(role, level) {
    if (role === 'head') return level === 'easy' ? ['d'] : ['d', 'g'];
    if (role === 'tail') return level === 'easy' ? ['c'] : ['g', 'c'];
    return level === 'easy' ? ['d', 'c'] : ['d', 'g', 'c'];
  }
  function notesFor(song, role, level) {
    const lanes = lanesFor(role, level);
    const mine = (n) => role === 'both' || n.inst === 'g' || (role === 'head' ? n.inst === 'd' : n.inst === 'c');
    return song.charts[level].filter(mine).map((n) => Object.assign({}, n, { lane: lanes.indexOf(n.inst) }));
  }

  const built = {};
  const get = (id) => built[id] || (built[id] = build(SONGS.find((s) => s.id === id) || SONGS[0]));

  LD.songs = { SONGS, LEVELS, PAT, build, get, posAt, lanesFor, notesFor, poleX, plan };
})();
