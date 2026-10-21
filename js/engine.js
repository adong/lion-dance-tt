/* TT Lion Dance: judging and scoring, one player at a time. Pure logic on song times (seconds), no page.
     create(song, { role, level })   a player: 'both' (1 player plays the whole lion), 'head' or 'tail'
     press(p, lane, t)                a key or pad went down at song time t (lane -1 = a gong pad / any pad)
     update(p, t)                     notes whose window has passed become misses
   Each note gets PERFECT, GREAT or OK by how close the press was, or a miss (the lion wobbles, the combo starts
   again). On 🔥 NORMAL the lion's spirit meter goes up with hits and down with misses; if it runs out, that player is
   out of the song. On 🐣 EASY nothing ever ends the song. While the brother plays the big drum, the timing windows
   are twice as wide. */
(function () {
  'use strict';
  const LD = (window.LD = window.LD || {});

  const POINTS = { PERFECT: 300, GREAT: 200, OK: 100 };
  const METER = { start: 0.6, PERFECT: 0.03, GREAT: 0.025, OK: 0.015, miss: -0.08, treat: 0.25 };

  function create(song, o) {
    const level = LD.songs.LEVELS[o.level];
    const notes = LD.songs.notesFor(song, o.role, o.level).map((n) => Object.assign(n, { judged: null, err: 0 }));
    return {
      song, role: o.role, level, lanes: LD.songs.lanesFor(o.role, o.level), notes, max: notes.length * POINTS.PERFECT,
      onEvent: o.onEvent || null, score: 0, points: 0, combo: 0, maxCombo: 0, meter: METER.start, failed: false,
      counts: { PERFECT: 0, GREAT: 0, OK: 0, miss: 0 }, next: 0, boost: -Infinity,
    };
  }

  const windowsAt = (p, t) => {
    const w = p.level.windows;
    return t < p.boost ? { perfect: w.perfect * 2, great: w.great * 2, ok: w.ok * 2 } : w;
  };
  function emit(p, type, data) { if (p.onEvent) p.onEvent(type, data, p); }

  function meter(p, d) {
    if (!p.level.canFail || p.failed) return;
    p.meter = Math.max(0, Math.min(1, p.meter + d));
    if (p.meter <= 0) { p.failed = true; emit(p, 'fail', {}); }
  }

  // A pad goes down. A note can be hit by its own pad; a gong with no pad of its own (lane -1) by any pad; and a
  // gong pad (pressed as lane -1 by a player who has one) hits only gongs.
  function press(p, lane, t) {
    if (p.failed) return null;
    const w = windowsAt(p, t);
    let best = null;
    for (let i = p.next; i < p.notes.length; i++) {
      const n = p.notes[i];
      if (n.t - t > w.ok) break;
      if (n.judged || Math.abs(n.t - t) > w.ok) continue;
      if (n.lane === lane || n.lane === -1) { best = n; break; } // the earliest unjudged note in reach
    }
    if (!best) { emit(p, 'empty', { lane, t }); return null; }
    const err = t - best.t, a = Math.abs(err);
    const rating = a <= w.perfect ? 'PERFECT' : a <= w.great ? 'GREAT' : 'OK';
    best.judged = rating;
    best.err = err;
    const mult = 1 + Math.min(p.combo, 40) / 40; // up to double at a 40 combo
    p.combo++;
    if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    p.points += POINTS[rating];
    p.score += Math.round(POINTS[rating] * mult);
    p.counts[rating]++;
    meter(p, METER[rating]);
    emit(p, 'hit', { rating, note: best, t, combo: p.combo });
    advance(p);
    return rating;
  }

  function advance(p) {
    while (p.next < p.notes.length && p.notes[p.next].judged) p.next++;
  }

  function update(p, t) {
    if (p.failed) return;
    const w = windowsAt(p, t);
    for (let i = p.next; i < p.notes.length; i++) {
      const n = p.notes[i];
      if (n.t + w.ok >= t) break;
      if (n.judged) continue;
      n.judged = 'miss';
      p.counts.miss++;
      p.combo = 0;
      emit(p, 'miss', { note: n, t });
      meter(p, METER.miss);
      if (p.failed) return;
    }
    advance(p);
  }

  // how well it went, 0..1: points against a perfect run (the combo bonus doesn't count here)
  const percent = (p) => (p.max ? p.points / p.max : 0);
  function stars(p) {
    if (p.failed) return 0;
    const pc = percent(p);
    let s = pc >= 0.9 ? 3 : pc >= 0.7 ? 2 : pc >= 0.4 ? 1 : 0;
    if (!p.level.canFail && s < 1) s = 1; // on EASY, dancing to the end is worth a star
    return s;
  }
  const done = (p) => p.failed || p.next >= p.notes.length;

  // the brother plays the big drum until song time `until`
  function boost(p, until) { p.boost = Math.max(p.boost, until); }
  function treat(p) { meter(p, METER.treat); }

  LD.engine = { create, press, update, percent, stars, done, boost, treat, POINTS, METER };
})();
