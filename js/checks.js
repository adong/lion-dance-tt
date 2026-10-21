/* TT Lion Dance: the headless check of the rules, by data (no sound, no page). game.check() / game.prove() in the
   page, `node tools/check.js` in a terminal.
     grid      every note sits on the beat grid: eighths on 🔥 NORMAL, beats on 🐣 EASY
     sound     the music plays a drum, cymbal or gong under every note, of the same kind, at the same time
     subset    🐣 EASY is part of 🔥 NORMAL, note for note
     playable  nobody gets two notes at once or closer than the grid
     players   in 2 players both brothers get plenty to play (the head: drum + gong, the tail: cymbal + gong)
     story     wake on the first gong, reach and pluck the green, spit the leaves, bow, in that order
     poles     one leap per pole, each from a gong on a bar's first beat, landing one beat later on a drum, nothing
               to hit in the air, on top of the right pole; the route never jumps
     easy      🐣 EASY never fails the song: missing everything, or mashing, still dances to the green with a star
     normal    🔥 NORMAL can fail (missing everything runs the meter out)
     perfect   pressing every note on time gets every note PERFECT and 3 stars, for every song, player and level
     boost     while the brother plays the big drum, the timing windows are twice as wide
   prove() breaks each rule on purpose (a copy of the data) and shows the matching check catches it. */
(function () {
  'use strict';
  const LD = (window.LD = window.LD || {});
  const S = () => LD.songs, E = () => LD.engine;
  const EPS = 0.001;
  const LEVELS = ['easy', 'normal'];
  const ROLES = ['both', 'head', 'tail'];
  const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
  const songs = () => S().SONGS.map((d) => S().build(d));

  const checks = {
    grid(list) {
      const bad = [];
      for (const s of list) for (const lv of LEVELS) {
        const step = s.slot * S().LEVELS[lv].grid;
        for (const n of s.charts[lv]) {
          const k = Math.round(n.t / step);
          if (Math.abs(n.t - k * step) > EPS) bad.push(`${s.id} ${lv}: note at ${n.t.toFixed(3)} s is off the grid by ${((n.t - k * step) * 1000).toFixed(0)} ms`);
          if (n.t < -EPS || n.t > s.length) bad.push(`${s.id} ${lv}: note at ${n.t.toFixed(3)} s is outside the song`);
        }
      }
      return bad;
    },
    sound(list) {
      const bad = [];
      for (const s of list) for (const lv of LEVELS) for (const n of s.charts[lv]) {
        if (!s.events.some((e) => e.kind === n.inst && Math.abs(e.t - n.t) < EPS)) bad.push(`${s.id} ${lv}: no ${n.inst} sound under the note at ${n.t.toFixed(3)} s`);
      }
      return bad;
    },
    subset(list) {
      const bad = [];
      for (const s of list) for (const n of s.charts.easy) {
        if (!s.charts.normal.some((m) => m.inst === n.inst && Math.abs(m.t - n.t) < EPS)) bad.push(`${s.id}: EASY ${n.inst} at ${n.t.toFixed(3)} s isn't in NORMAL`);
      }
      return bad;
    },
    playable(list) {
      const bad = [];
      for (const s of list) for (const lv of LEVELS) for (const role of ROLES) {
        const ns = S().notesFor(s, role, lv);
        const gap = s.slot * S().LEVELS[lv].grid - EPS;
        for (let i = 1; i < ns.length; i++) if (ns[i].t - ns[i - 1].t < gap) bad.push(`${s.id} ${lv} ${role}: notes ${((ns[i].t - ns[i - 1].t) * 1000).toFixed(0)} ms apart at ${ns[i].t.toFixed(3)} s`);
        for (const n of ns) if (n.lane === -1 && n.inst !== 'g') bad.push(`${s.id} ${lv} ${role}: a ${n.inst} note has no pad`);
      }
      return bad;
    },
    players(list) {
      const bad = [];
      for (const s of list) for (const lv of LEVELS) for (const role of ['head', 'tail']) {
        const ns = S().notesFor(s, role, lv);
        const own = ns.filter((n) => n.inst !== 'g').length;
        const need = lv === 'easy' ? 8 : 20;
        if (own < need) bad.push(`${s.id} ${lv}: the ${role} gets only ${own} notes of his own`);
        for (const sec of s.sections) {
          if (sec.type === 'end') continue;
          if (!ns.some((n) => n.t >= sec.from - EPS && n.t < sec.to - EPS)) bad.push(`${s.id} ${lv}: the ${role} has nothing to play in ${sec.type}`);
        }
      }
      return bad;
    },
    story(list) {
      const bad = [];
      for (const s of list) for (const lv of LEVELS) {
        const ns = s.charts[lv];
        const at = (role) => ns.filter((n) => n.role === role);
        if (!ns.length || ns[0].role !== 'wake' || ns[0].inst !== 'g' || Math.abs(ns[0].t) > EPS) bad.push(`${s.id} ${lv}: the first note isn't the waking gong at 0 s`);
        const order = ['wake', 'reach', 'pluck', 'spit', 'bow'].map((r) => at(r));
        order.forEach((a, i) => { if (a.length !== 1) bad.push(`${s.id} ${lv}: ${a.length} notes for ${['wake', 'reach', 'pluck', 'spit', 'bow'][i]}`); });
        if (order.every((a) => a.length === 1)) {
          const ts = order.map((a) => a[0].t);
          for (let i = 1; i < ts.length; i++) if (!(ts[i] > ts[i - 1])) bad.push(`${s.id} ${lv}: the story is out of order`);
          if (Math.abs(ts[2] - ts[1] - 2 * s.spb) > EPS) bad.push(`${s.id} ${lv}: the pluck isn't 2 beats after the reach`);
          const lastLeap = at('leap').pop();
          if (lastLeap && !(ts[1] > lastLeap.t + s.spb)) bad.push(`${s.id} ${lv}: it reaches for the green before landing on the last pole`);
          if (at('reach')[0].inst !== 'g' || at('spit')[0].inst !== 'g' || at('bow')[0].inst !== 'g') bad.push(`${s.id} ${lv}: a big moment isn't a gong`);
        }
      }
      return bad;
    },
    poles(list) {
      const bad = [];
      for (const s of list) {
        const leapParts = s.route.parts.filter((p) => p.kind === 'leap');
        if (leapParts.length !== s.def.poles.length) bad.push(`${s.id}: ${leapParts.length} leaps for ${s.def.poles.length} poles`);
        for (const lv of LEVELS) {
          const gongs = s.charts[lv].filter((n) => n.role === 'leap');
          if (gongs.length !== s.def.poles.length) bad.push(`${s.id} ${lv}: ${gongs.length} leap gongs for ${s.def.poles.length} poles`);
          for (const g of gongs) if (g.inst !== 'g' || g.slot !== 0) bad.push(`${s.id} ${lv}: a leap at ${g.t.toFixed(3)} s isn't a gong on the bar's first beat`);
        }
        leapParts.forEach((p, i) => {
          const g = s.charts.normal.find((n) => n.role === 'leap' && n.pole === i);
          if (!g || Math.abs(g.t - p.t0) > EPS) bad.push(`${s.id}: leap ${i + 1} doesn't start on its gong`);
          const beats = (p.t1 - p.t0) / s.spb;
          if (Math.abs(beats - 1) > EPS) bad.push(`${s.id}: leap ${i + 1} lasts ${beats.toFixed(2)} beats, not 1`);
          const kb = p.t1 / s.spb;
          if (Math.abs(kb - Math.round(kb)) > EPS / s.spb) bad.push(`${s.id}: leap ${i + 1} lands off the beat`);
          if (!s.charts.normal.some((n) => n.inst === 'd' && Math.abs(n.t - p.t1) < EPS)) bad.push(`${s.id}: leap ${i + 1} doesn't land on a drum`);
          for (const lv of LEVELS) if (s.charts[lv].some((n) => n.t > p.t0 + EPS && n.t < p.t1 - EPS)) bad.push(`${s.id} ${lv}: a note to hit in the air during leap ${i + 1}`);
          const pole = s.route.poles[i];
          const end = S().posAt(s, p.t1 + 0.001);
          if (Math.abs(end.x - pole.x) > 0.01 || Math.abs(end.y - pole.h) > 0.01) bad.push(`${s.id}: leap ${i + 1} lands at (${end.x.toFixed(2)}, ${end.y.toFixed(2)}), not on pole ${i + 1} (${pole.x}, ${pole.h})`);
          const mid = S().posAt(s, (p.t0 + p.t1) / 2);
          if (!(mid.y > Math.max(p.y0, p.y1) + 0.3)) bad.push(`${s.id}: leap ${i + 1} doesn't go up in the air`);
        });
        // continuous: never more than a small move in one 120th of a second
        let prev = S().posAt(s, -s.bar), worst = 0, at = 0;
        for (let t = -s.bar; t <= s.length; t += 1 / 120) {
          const q = S().posAt(s, t);
          const d = Math.hypot(q.x - prev.x, q.y - prev.y);
          if (d > worst) { worst = d; at = t; }
          prev = q;
        }
        if (worst > 0.25) bad.push(`${s.id}: the lion jumps ${worst.toFixed(2)} m in one frame at ${at.toFixed(3)} s`);
        const last = s.route.poles[s.route.poles.length - 1], fin = S().posAt(s, s.length);
        if (Math.abs(fin.x - last.x) > 0.01 || Math.abs(fin.y - last.h) > 0.01) bad.push(`${s.id}: the lion doesn't finish on the last pole`);
      }
      return bad;
    },
    easy(list) {
      const bad = [];
      for (const s of list) for (const role of ROLES) {
        for (const style of ['miss', 'mash']) {
          const p = E().create(s, { role, level: 'easy' });
          let k = 0;
          for (let t = -s.bar; t <= s.length + 1; t += 1 / 60) {
            if (style === 'mash' && ++k % 3 === 0) E().press(p, (k >> 2) % p.lanes.length, t);
            E().update(p, t);
          }
          if (p.failed) bad.push(`${s.id} ${role}: EASY failed the song (${style})`);
          if (!E().done(p)) bad.push(`${s.id} ${role}: EASY never finished (${style})`);
          if (E().stars(p) < 1) bad.push(`${s.id} ${role}: EASY to the end got no star (${style})`);
        }
        const end = S().posAt(s, s.length);
        if (end.pole !== s.route.poles.length - 1) bad.push(`${s.id}: the lion didn't reach the last pole`);
      }
      return bad;
    },
    normal(list) {
      const bad = [];
      for (const s of list) {
        const p = E().create(s, { role: 'both', level: 'normal' });
        for (let t = -s.bar; t <= s.length + 1; t += 1 / 60) E().update(p, t);
        if (!p.failed) bad.push(`${s.id}: NORMAL missing everything never ran out`);
      }
      return bad;
    },
    perfect(list, o = {}) {
      const bad = [];
      const late = o.late || 0;
      for (const s of list) for (const lv of LEVELS) for (const role of ROLES) {
        const p = E().create(s, { role, level: lv });
        const todo = p.notes.map((n) => ({ t: n.t + late, lane: n.lane === -1 ? 0 : n.lane }));
        let i = 0;
        for (let t = -s.bar; t <= s.length + 1; t += 1 / 60) {
          while (i < todo.length && todo[i].t <= t) { E().press(p, todo[i].lane, todo[i].t); i++; }
          E().update(p, t);
        }
        if (p.counts.PERFECT !== p.notes.length) bad.push(`${s.id} ${lv} ${role}: ${p.counts.PERFECT}/${p.notes.length} PERFECT`);
        if (E().stars(p) !== 3) bad.push(`${s.id} ${lv} ${role}: ${E().stars(p)} stars for a perfect run`);
      }
      return bad;
    },
    boost(list) {
      const bad = [];
      const s = list[0];
      for (const lv of LEVELS) {
        const w = S().LEVELS[lv].windows.ok;
        const a = E().create(s, { role: 'both', level: lv }), b = E().create(s, { role: 'both', level: lv });
        const n = a.notes[3];
        E().boost(b, n.t + 8);
        if (E().press(a, n.lane < 0 ? 0 : n.lane, n.t + w * 1.6)) bad.push(`${lv}: a press 1.6x the window late counted without the big drum`);
        if (!E().press(b, n.lane < 0 ? 0 : n.lane, n.t + w * 1.6)) bad.push(`${lv}: the big drum didn't widen the window`);
      }
      return bad;
    },
  };

  // Each rule broken on purpose, on a copy, with the check that must catch it.
  const breaks = {
    grid: (l) => { l[0].charts.easy[5].t += 0.03; return checks.grid(l); },
    sound: (l) => { const n = l[1].charts.normal[9]; l[1].events = l[1].events.filter((e) => !(e.kind === n.inst && Math.abs(e.t - n.t) < EPS)); return checks.sound(l); },
    subset: (l) => { const n = l[0].charts.easy[4]; n.inst = n.inst === 'd' ? 'c' : 'd'; return checks.subset(l); },
    playable: (l) => { const n = l[0].charts.normal[6]; l[0].charts.normal.splice(7, 0, Object.assign({}, n, { t: n.t + 0.05 })); return checks.playable(l); },
    players: (l) => { l[2].charts.easy = l[2].charts.easy.filter((n) => n.inst !== 'c'); return checks.players(l); },
    story: (l) => { l[0].charts.normal = l[0].charts.normal.filter((n) => n.role !== 'pluck'); return checks.story(l); },
    poles: (l) => { const p = l[1].route.parts.find((q) => q.kind === 'leap'); p.t1 = p.t0 + 1.5 * l[1].spb; return checks.poles(l); },
    route: (l) => { const p = l[2].route.parts.find((q) => q.kind === 'walk'); p.x1 += 1.5; return checks.poles(l).filter((m) => /jumps/.test(m)); },
    easy: (l) => { const keep = S().LEVELS.easy.canFail; S().LEVELS.easy.canFail = true; try { return checks.easy(l); } finally { S().LEVELS.easy.canFail = keep; } },
    normal: (l) => { const keep = S().LEVELS.normal.canFail; S().LEVELS.normal.canFail = false; try { return checks.normal(l); } finally { S().LEVELS.normal.canFail = keep; } },
    perfect: (l) => checks.perfect(l, { late: 0.06 }),
    boost: (l) => { const keep = E().boost; LD.engine.boost = () => {}; try { return checks.boost(l); } finally { LD.engine.boost = keep; } },
  };

  function run(o = {}) {
    const t0 = Date.now();
    const list = songs();
    const results = Object.keys(checks).map((name) => {
      const problems = checks[name](list);
      return { name, ok: problems.length === 0, problems };
    });
    const prove = o.prove ? Object.keys(breaks).map((name) => {
      const found = breaks[name](clone(list));
      return { name, caught: found.length > 0, first: found[0] || '(nothing caught)' };
    }) : [];
    const stats = list.map((s) => {
      const c = (lv, f) => s.charts[lv].filter(f).length;
      return `${s.def.emoji} ${s.def.name} ${s.bpm} BPM, ${s.length.toFixed(1)} s, ${s.def.poles.length} poles: EASY ${s.charts.easy.length} notes, NORMAL ${s.charts.normal.length}` +
        ` (head ${c('normal', (n) => n.inst !== 'c')}, tail ${c('normal', (n) => n.inst !== 'd')})`;
    });
    const ok = results.every((r) => r.ok) && prove.every((p) => p.caught);
    return { ok, results, prove, stats, ms: Date.now() - t0 };
  }

  LD.checks = { run, checks, breaks };
})();
