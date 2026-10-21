/* TT Lion Dance: the game. Screens (home, the story, dancing, pause, results), keys and pads, the song loop, the
   lion's story moments on the music's time, the brother's visits, scores and best scores.
   window.game is for tests: start(), step(seconds), check(), prove(), state(), autopilot(on), call(), press(). */
(function () {
  'use strict';
  const LD = window.LD;
  const S = Kit.sound, A = LD.audio, SG = LD.songs, E = LD.engine;
  const $ = (id) => document.getElementById(id);
  const STORE = 'lionDanceTT.v1';
  const NAME = window.LD_TITLE;

  function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
  const prefs = Object.assign({ song: 'lantern', who: 'teddy', levels: { teddy: 'easy', tommy: 'easy' }, best: {}, storySeen: false }, load());
  if (!prefs.levels || typeof prefs.levels !== 'object') prefs.levels = { teddy: 'easy', tommy: 'easy' };
  if (!prefs.best || typeof prefs.best !== 'object') prefs.best = {};
  if (!SG.SONGS.some((s) => s.id === prefs.song)) prefs.song = 'lantern';
  if (!['teddy', 'tommy', 'both'].includes(prefs.who)) prefs.who = 'teddy';
  function save() { try { localStorage.setItem(STORE, JSON.stringify(prefs)); } catch (e) { /* storage blocked */ } }

  const ui = {};
  const G = {
    state: 'boot', song: null, players: [], solo: true, lay: null, lion: null, cast: null, moments: [], mi: 0, ei: 0,
    held: false, vt: 0, flash: [], endT: 0, outcome: null, count: -9, auto: false, lastText: {}, crown: null,
  };
  const clock = LD.clock.create({ audio: () => (G.held ? null : A.source()), perf: () => (G.held ? G.vt : performance.now() / 1000) });
  const music = A.player();
  let faces = {};

  // ------------------------------------------------------------------ who plays which half
  function playersFor(who) {
    if (who === 'both') return [{ id: 'teddy', role: 'head', level: prefs.levels.teddy }, { id: 'tommy', role: 'tail', level: prefs.levels.tommy }];
    return [{ id: who, role: 'both', level: prefs.levels[who] }];
  }
  // Teddy is the head and Tommy the tail. Playing alone, a CPU friend wears the other half.
  const castFor = (who) => (who === 'tommy' ? { head: 'foxy', tail: 'tommy' } : who === 'teddy' ? { head: 'teddy', tail: 'froggy' } : { head: 'teddy', tail: 'tommy' });

  function newLion() {
    const cast = castFor(prefs.who);
    if (G.lion) { LD.stage.scene.remove(G.lion.root); LD.lion.dispose(G.lion); }
    G.lion = LD.lion.create(cast);
    G.cast = cast;
    G.crown = null;
    LD.stage.scene.add(G.lion.root);
  }

  function setSong(id) {
    G.song = SG.get(id);
    LD.stage.setSong(G.song);
    LD.stage.showGreen(true);
  }

  // ------------------------------------------------------------------ screens
  function show(name) {
    ui.home.classList.toggle('hidden', name !== 'home');
    ui.hud.classList.toggle('hidden', !(name === 'play' || name === 'end'));
    ui.pads.classList.toggle('hidden', name !== 'play');
    ui.buddyBtn.classList.toggle('hidden', name !== 'play');
    ui.results.classList.toggle('hidden', name !== 'results');
    ui.story.classList.toggle('hidden', name !== 'story');
    ui.pause.classList.add('hidden');
  }

  function goHome() {
    G.state = 'home';
    show('home');
    LD.buddy.clear();
    LD.lanes.clear();
    LD.stage.clearParts();
    ui.songName.classList.add('hidden');
    if (!G.song || G.song.id !== prefs.song) setSong(prefs.song);
    newLion();
    LD.stage.showGreen(true);
    G.lay = null;
    layout();
    homePreview();
    renderHome();
  }

  // the title plays the first bars of the picked song, softly, round and round
  function homePreview() {
    clock.start(0);
    music.start(G.song, clock, { vol: 0.5, loop: { from: 0, to: G.song.bar * 4 } });
  }

  function openStory(then) {
    G.storyThen = then || null;
    G.state = 'story';
    show('story');
  }
  function closeStory() {
    prefs.storySeen = true;
    save();
    if (G.storyThen === 'play') startSong();
    else { G.state = 'home'; show('home'); }
  }

  // ------------------------------------------------------------------ a song
  function startSong() {
    if (!G.song || G.song.id !== prefs.song) setSong(prefs.song);
    newLion();
    const song = G.song;
    G.players = playersFor(prefs.who).map((cfg, i) => {
      const e = E.create(song, { role: cfg.role, level: cfg.level, onEvent: (type, data) => onEngine(i, type, data) });
      return Object.assign(cfg, { i, e, lead: cfg.level === 'easy' ? 2.3 : 1.7, out: false });
    });
    G.solo = G.players.length === 1;
    G.moments = song.charts.normal.filter((n) => n.role).map((n) => ({ t: n.t, type: n.role, pole: n.pole }));
    const at = (r) => (G.moments.find((m) => m.type === r) || { t: Infinity }).t;
    G.times = { reach: at('reach'), pluck: at('pluck'), spit: at('spit'), bow: at('bow') };
    G.mi = 0; G.ei = 0; G.count = -9; G.outcome = null; G.endT = 0;
    LD.stage.showGreen(true);
    LD.stage.clearParts();
    LD.lanes.clear();
    LD.buddy.setup(G.players[0].id, G.solo);
    buildHud();
    buildPads();
    G.state = 'play';
    show('play');
    G.lay = null;
    layout();
    clock.start(-song.bar - 1.4);
    music.start(song, clock, { vol: 1 });
    ui.songName.querySelector('.e').textContent = song.def.emoji;
    ui.songName.querySelector('.n').textContent = song.def.name;
    ui.songName.classList.remove('hidden');
  }

  // the lion's place and pose at song time t
  function surfaceUnder(x) {
    for (const p of G.song.route.poles) if (Math.abs(x - p.x) < 1.45) return p.h;
    return 0;
  }
  const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  function liftAt(t) {
    const { reach, pluck, spit } = G.times, spb = G.song.spb;
    if (t < reach) return 0;
    if (t < pluck) return smooth((t - reach) / (pluck - reach));
    if (t < pluck + spb) return 1;
    if (t < spit) return 1 - smooth((t - pluck - spb) / (spit - pluck - spb));
    return 0;
  }
  function sleepAt(t) {
    if (t < 0) return 1;
    const b = G.times.bow;
    if (t >= b && t < b + G.song.spb * 1.5) return 0.55;
    return 0;
  }
  function lionState(t) {
    const pos = SG.posAt(G.song, t);
    const surface = pos.kind === 'leap' ? surfaceUnder(pos.x) : pos.y;
    return { x: pos.x, y: pos.y, kind: pos.kind, surface, beat: t / G.song.spb, air: pos.air, sleep: sleepAt(t), lift: liftAt(t) };
  }

  // the story, on the music's time
  function moment(m) {
    const L = G.lion;
    if (m.type === 'wake') {
      LD.lion.roar(L);
      LD.stage.sparks(LD.lion.headWorld(L), 20);
      toast('THE LION WAKES UP!', 'story');
    } else if (m.type === 'leap' && m.pole === 0) {
      toast('UP ONTO THE POLES!', 'story');
    } else if (m.type === 'land') {
      const pole = G.song.route.poles[m.pole];
      LD.stage.sparks(new THREE.Vector3(pole.x, pole.h + 0.2, 0.4), 10, '#ffffff');
      if (m.pole === G.song.route.poles.length - 1) toast('THE LAST POLE!', 'story');
    } else if (m.type === 'reach') {
      toast('REACH FOR THE GREEN!', 'story');
    } else if (m.type === 'pluck') {
      LD.stage.showGreen(false);
      LD.lion.chomp(L);
      A.sfx.chomp();
      LD.stage.sparks(LD.lion.mouthWorld(L), 18, '#8ee870');
      toast('IT PLUCKED THE GREEN!', 'story');
    } else if (m.type === 'spit') {
      const at = LD.lion.mouthWorld(L);
      LD.lion.roar(L);
      LD.stage.burst('🥬', at, 12, { speed: 3.2, up: 3.5, size: 0.5, life: 1.8 });
      LD.stage.burst('🧧', at, 3, { speed: 2, up: 4.5, size: 0.55, life: 1.8 });
      A.sfx.firecrackers();
      toast('LUCKY LEAVES FOR EVERYONE!', 'story');
    } else if (m.type === 'bow') {
      LD.lion.blink(L);
    }
  }

  function onEngine(i, type, data) {
    const pl = G.players[i];
    if (!pl || G.state !== 'play') return;
    if (type === 'hit') {
      LD.lion.hit(G.lion, data.note.inst, data.rating);
      const [x, y] = popAt(i, data.note.lane);
      LD.lanes.pop(data.rating, x, y);
      A.sfx.hit(data.rating);
      if (data.rating === 'PERFECT' && data.note.inst === 'g') LD.stage.sparks(LD.lion.headWorld(G.lion), 14);
      if (data.combo > 0 && data.combo % 25 === 0) { A.sfx.combo(data.combo); toast(`${data.combo} IN A ROW!`, 'story'); }
    } else if (type === 'miss') {
      LD.lion.miss(G.lion);
      const [x, y] = popAt(i, data.note.lane);
      LD.lanes.pop('miss', x, y);
    } else if (type === 'fail') {
      pl.out = true;
      A.sfx.oops();
      toast(`${Kit.roster.get(pl.id).name} IS TIRED!`, 'oops');
      buildPadsDim();
    }
  }
  function popAt(i, lane) {
    const gp = G.lay && G.lay.groups[i];
    if (!gp) return [innerWidth / 2, innerHeight / 2];
    const x = lane >= 0 && gp.lanes[lane] ? gp.lanes[lane].cx : gp.x + gp.w / 2;
    return [x, gp.target - gp.note * 0.7];
  }

  function finish() {
    if (G.state !== 'play') return;
    const ok = G.players.some((p) => !p.e.failed);
    G.state = 'end';
    G.endT = 0;
    const solo = G.solo;
    const rows = G.players.map((p) => {
      const stars = E.stars(p.e);
      const key = `${G.song.id}|${p.level}|${solo ? 'solo' : 'duo'}|${p.id}`;
      const old = prefs.best[key] || 0;
      const isNew = ok && !p.e.failed && p.e.score > old;
      if (isNew) prefs.best[key] = p.e.score;
      return { id: p.id, stars, score: p.e.score, best: Math.max(old, isNew ? p.e.score : 0), isNew, counts: p.e.counts, failed: p.e.failed, level: p.level };
    });
    save();
    let win = -1;
    if (rows.length === 2) win = rows[0].stars !== rows[1].stars ? (rows[0].stars > rows[1].stars ? 0 : 1) : rows[0].score !== rows[1].score ? (rows[0].score > rows[1].score ? 0 : 1) : -1;
    else win = ok ? 0 : -1;
    G.outcome = { ok, rows, win };
    show('end');
    layout();
    if (ok) {
      // out of the costume: the winner (in 1 player: you) does his signature move; the friend waves
      const sigFor = (id) => {
        const e = Kit.roster.get(id);
        return G.players.some((p) => p.id === id) ? (e.signature || ['wave']) : ['wave'];
      };
      LD.lion.reveal(G.lion, [sigFor(G.cast.head), sigFor(G.cast.tail)]);
      if (win >= 0 && !solo) crown(rows[win].id);
      LD.lanes.party();
      A.sfx.cheer(true);
      A.sfx.fanfare(Math.max(...rows.map((r) => r.stars)));
    } else {
      A.sfx.oops();
      toast('THE LION IS TIRED!', 'oops');
    }
  }

  function crown(id) {
    const p = G.cast.head === id ? G.lion.front : G.lion.back;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: Kit.gfx.emojiTexture('👑'), transparent: true, depthWrite: false }));
    s.scale.setScalar(0.6);
    s.position.y = 2.55;
    p.root.add(s);
    G.crown = s;
  }

  function showResults() {
    G.state = 'results';
    show('results');
    const o = G.outcome;
    ui.rHead.textContent = o.ok ? (G.solo ? 'THE LION PLUCKED THE GREEN!' : 'GREAT TEAM, LION BROTHERS!') : 'THE LION IS TIRED! TRY AGAIN!';
    ui.rCols.innerHTML = '';
    o.rows.forEach((r, i) => {
      const col = document.createElement('div');
      col.className = 'rcol' + (o.win === i && o.rows.length > 1 ? ' win' : '');
      const role = G.solo ? '' : r.id === G.cast.head ? 'HEAD' : 'TAIL';
      col.innerHTML = `<div class="who2"><img alt="" src="${faces[r.id]}"><span>${Kit.roster.get(r.id).name}${o.win === i && o.rows.length > 1 ? ' 👑' : ''}</span></div>` +
        (role ? `<div class="rbest">${role}</div>` : '') +
        `<div class="rstars">${[0, 1, 2].map((k) => `<span class="${k < r.stars ? 'got' : ''}">⭐</span>`).join('')}</div>` +
        `<div class="rscore">${r.score.toLocaleString('en-US')}</div>` +
        (r.isNew ? '<div class="rnew">NEW BEST!</div>' : r.best ? `<div class="rbest">BEST ${r.best.toLocaleString('en-US')}</div>` : '') +
        `<div class="rcounts"><span>PERFECT ${r.counts.PERFECT}</span><span>GREAT ${r.counts.GREAT}</span><span>OK ${r.counts.OK}</span><span>MISS ${r.counts.miss}</span></div>`;
      ui.rCols.appendChild(col);
    });
    o.rows.forEach((r) => { for (let k = 0; k < r.stars; k++) setTimeout(() => A.sfx.star(k), 200 + k * 180); });
  }

  // ------------------------------------------------------------------ the frame
  function frame(dt) {
    const song = G.song;
    if (!song || !G.lion) return;
    if (G.state === 'home' || G.state === 'story' || G.state === 'boot') {
      const t = clock.now();
      music.tick();
      const st = { x: 0, y: 0, kind: 'stand', surface: 0, beat: t / song.spb, air: 0, sleep: 0, lift: 0, hideTags: false };
      LD.lion.update(G.lion, dt, st);
      LD.stage.update(dt, t, G.lion, { look: { h: 4.4, w: 4.6 }, ahead: 0.5, fx: 0.5 });
      LD.lanes.tick(dt);
      LD.lanes.draw(null);
      return;
    }
    if (G.state === 'paused') return;
    const t = clock.now();
    G.t = t;
    if (G.state === 'play') {
      music.tick();
      if (G.auto) autopilot(t);
      for (const p of G.players) E.update(p.e, t);
      while (G.mi < G.moments.length && G.moments[G.mi].t <= t) moment(G.moments[G.mi++]);
      const ev = song.events;
      while (G.ei < ev.length && ev[G.ei].t <= t) { const e = ev[G.ei++]; if (e.kind === 'd' || e.kind === 'c' || e.kind === 'g') LD.stage.ring(e.kind); }
      countIn(t);
    }
    const st = lionState(Math.min(t, song.length));
    if (G.state !== 'play') st.sleep = 0;
    LD.lion.update(G.lion, dt, st);
    LD.buddy.update(dt, t / song.spb);
    const playing = G.state === 'play';
    const look = playing ? { h: 7.6 + st.lift * 1.6, w: 9.5 } : { h: 4.6, w: 4.8 };
    LD.stage.update(dt, t, G.lion, { look, ahead: playing ? (LD.buddy.present() ? -0.9 : 1.3) : 0.2, lift: playing ? st.lift * 0.8 : 0, fx: playing ? 0.46 : 0.5 });
    for (const f of G.flash) for (let i = 0; i < f.length; i++) f[i] = Math.max(0, f[i] - dt * 5);
    LD.lanes.tick(dt);
    if (G.state === 'play') {
      LD.lanes.draw({
        lay: G.lay, t, flash: G.flash,
        players: G.players.map((p) => ({ p: p.e, lead: p.lead, boost: t < p.e.boost, out: p.e.failed })),
      });
      hud(t);
      if (t >= song.length || G.players.every((p) => p.e.failed)) finish();
    } else {
      LD.lanes.draw(null);
      G.endT += dt;
      if (G.state === 'end' && G.endT > (G.outcome && G.outcome.ok ? 3.2 : 1.6)) showResults();
    }
  }

  function countIn(t) {
    const b = Math.floor(t / G.song.spb + 1e-6);
    if (t > -G.song.bar * 0.8) ui.songName.classList.add('hidden');
    if (b >= -3 && b <= -1 && b !== G.count) {
      G.count = b;
      ui.bigCount.textContent = String(-b);
      ui.bigCount.classList.remove('anim');
      void ui.bigCount.offsetWidth;
      ui.bigCount.classList.add('anim');
    }
  }

  // tests and screenshots: every note pressed right on time
  function autopilot(t) {
    for (const p of G.players) {
      const e = p.e;
      for (let i = e.next; i < e.notes.length; i++) {
        const n = e.notes[i];
        if (n.t > t) break;
        if (!n.judged) press(p.i, n.lane, n.t);
      }
    }
  }

  // ------------------------------------------------------------------ playing: keys and pads
  // 1 player, any of these: drum A J ←, gong S K ↓ ↑ Space, cymbal D L →.
  const KEY1 = { KeyA: 'd', KeyJ: 'd', ArrowLeft: 'd', KeyS: 'g', KeyK: 'g', ArrowDown: 'g', ArrowUp: 'g', KeyW: 'g', Space: 'g', KeyD: 'c', KeyL: 'c', ArrowRight: 'c' };
  // 2 players: Teddy (the head) A and D, Tommy (the tail) ← and →: each brother's left and right pad.
  const KEY2 = { KeyA: [0, 0], KeyS: [0, 1], KeyD: [0, 1], KeyW: [0, 1], ArrowLeft: [1, 0], ArrowDown: [1, 0], ArrowUp: [1, 0], ArrowRight: [1, 1] };
  function keyLane(code) {
    if (G.solo) {
      const inst = KEY1[code];
      if (!inst) return null;
      const p = G.players[0];
      return [0, p.e.lanes.indexOf(inst)]; // -1 for a gong with no pad of its own: it hits the gongs
    }
    const k = KEY2[code];
    if (!k) return null;
    const p = G.players[k[0]];
    return [k[0], Math.min(k[1], p.e.lanes.length - 1)];
  }

  function press(pi, lane, at) {
    const p = G.players[pi];
    if (!p || G.state !== 'play') return null;
    const t = at == null ? clock.now() : at;
    const r = E.press(p.e, lane, t);
    const f = G.flash[pi];
    if (f) { if (lane >= 0) f[lane] = 1; else f.fill(0.6); }
    if (!r && !p.e.failed) A.sfx.pad(lane >= 0 ? p.e.lanes[lane] : 'g');
    const pads = ui.pads.querySelectorAll(`.pad[data-p="${pi}"]`);
    pads.forEach((el) => { if (lane < 0 || +el.dataset.l === lane) { el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 110); } });
    return r;
  }

  const PAD_COL = { d: 'linear-gradient(160deg, #ff7a5a, #c8201e)', g: 'linear-gradient(160deg, #ffc46a, #c06a1a)', c: 'linear-gradient(160deg, #fff07a, #e0a020)' };
  const PAD_NAME = { d: 'DRUM', g: 'GONG', c: 'CYMBAL' };
  const PAD_KEYS1 = { d: 'A', g: 'S', c: 'D' };
  const PAD_KEYS2 = [['A', 'D'], ['←', '→']];
  function buildPads() {
    ui.pads.innerHTML = '';
    G.flash = G.players.map((p) => p.e.lanes.map(() => 0));
    G.players.forEach((p, pi) => p.e.lanes.forEach((inst, li) => {
      const b = document.createElement('button');
      b.className = 'pad';
      b.dataset.p = pi;
      b.dataset.l = li;
      b.style.setProperty('--c', PAD_COL[inst]);
      const key = G.solo ? PAD_KEYS1[inst] : p.e.lanes.length === 1 ? PAD_KEYS2[pi].join(' ') : PAD_KEYS2[pi][li];
      b.innerHTML = `<img alt="" src="${LD.lanes.icon(inst)}"><span class="nm">${PAD_NAME[inst]}</span><kbd>${key}</kbd>`;
      b.setAttribute('aria-label', PAD_NAME[inst]);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); S.init(); press(pi, li); });
      ui.pads.appendChild(b);
    }));
    // the brother button: his face (1 player), or a high five (2 players)
    if (G.solo) {
      const id = Kit.roster.buddyFor(G.players[0].id);
      ui.buddyFace.src = faces[id];
      ui.buddyFace.classList.remove('hidden');
      ui.fiveIcon.classList.add('hidden');
      ui.buddyBtn.setAttribute('aria-label', 'Call your brother');
      ui.buddyKey.textContent = 'T';
    } else {
      ui.buddyFace.classList.add('hidden');
      ui.fiveIcon.classList.remove('hidden');
      ui.buddyBtn.setAttribute('aria-label', 'High five');
      ui.buddyKey.textContent = 'T';
    }
  }
  function buildPadsDim() {
    G.players.forEach((p, pi) => ui.pads.querySelectorAll(`.pad[data-p="${pi}"]`).forEach((el) => el.classList.toggle('dim', p.e.failed)));
  }

  function callBrother() {
    if (G.state !== 'play') return;
    S.init();
    LD.buddy.call();
  }

  // ------------------------------------------------------------------ the HUD
  function buildHud() {
    ui.pills.innerHTML = '';
    G.lastText = {};
    G.players.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'pl' + (i === 1 ? ' right' : '');
      const lvl = p.level === 'easy' ? '🐣 EASY' : '🔥 NORMAL';
      const role = G.solo ? '' : p.role === 'head' ? ' · HEAD' : ' · TAIL';
      d.innerHTML = `<img class="me" alt="" src="${faces[p.id]}"><div class="num"><span class="sc" data-no-lang>0</span><span class="lv">${lvl}${role}</span>` +
        (p.level === 'normal' ? '<span class="meter"><b></b></span>' : '') + '</div>';
      ui.pills.appendChild(d);
      p.pill = d;
    });
  }
  function setText(el, key, s) {
    if (G.lastText[key] === s) return; // write only when it changes, so Kit.lang's translation isn't fought every frame
    G.lastText[key] = s;
    el.textContent = s;
  }
  function hud(t) {
    ui.progressFill.style.transform = `scaleX(${Math.max(0, Math.min(1, t / G.song.length))})`;
    G.players.forEach((p, i) => {
      setText(p.pill.querySelector('.sc'), 'sc' + i, p.e.score.toLocaleString('en-US'));
      const m = p.pill.querySelector('.meter b');
      if (m) m.style.transform = `scaleX(${p.e.meter})`;
      p.pill.classList.toggle('out', p.e.failed);
    });
    ui.buddyBtn.classList.toggle('here', LD.buddy.present() || G.players.some((p) => t < p.e.boost));
  }

  // ------------------------------------------------------------------ the home screen
  const TILES = { lantern: '#ff7a5a', plum: '#ff8fc8', envelope: '#ffcf4a' };
  function renderHome() {
    ui.songs.innerHTML = '';
    for (const d of SG.SONGS) {
      const b = document.createElement('button');
      b.className = 'card' + (d.id === prefs.song ? ' on' : '');
      b.style.setProperty('--tile', TILES[d.id]);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', d.id === prefs.song ? 'true' : 'false');
      b.setAttribute('aria-label', d.name);
      const best = bestFor(d.id);
      b.innerHTML = `<span class="poles">🌸×${d.poles.length}</span><span class="emo">${d.emoji}</span><span class="nm">${d.name}</span>` +
        (best ? `<span class="best" data-no-lang>⭐ ${best.toLocaleString('en-US')}</span>` : '');
      b.addEventListener('click', () => pickSong(d.id));
      ui.songs.appendChild(b);
    }
    for (const b of ui.who.querySelectorAll('button')) b.classList.toggle('on', b.dataset.who === prefs.who);
    ui.lvls.innerHTML = '';
    const ids = prefs.who === 'both' ? ['teddy', 'tommy'] : [prefs.who];
    for (const id of ids) {
      const box = document.createElement('div');
      box.className = 'lvl';
      box.innerHTML = `<img alt="" src="${faces[id]}">`;
      for (const lv of ['easy', 'normal']) {
        const b = document.createElement('button');
        b.className = prefs.levels[id] === lv ? 'on' : '';
        b.innerHTML = lv === 'easy' ? '<span>🐣</span>EASY' : '<span>🔥</span>NORMAL';
        b.setAttribute('aria-label', `${Kit.roster.get(id).name} ${lv === 'easy' ? 'EASY' : 'NORMAL'}`);
        b.addEventListener('click', () => { prefs.levels[id] = lv; save(); A.sfx.tap(); renderHome(); });
        box.appendChild(b);
      }
      ui.lvls.appendChild(box);
    }
  }
  function bestFor(songId) {
    const solo = prefs.who !== 'both';
    const ids = solo ? [prefs.who] : ['teddy', 'tommy'];
    let best = 0;
    for (const id of ids) best = Math.max(best, prefs.best[`${songId}|${prefs.levels[id]}|${solo ? 'solo' : 'duo'}|${id}`] || 0);
    return best;
  }
  function pickSong(id) {
    if (prefs.song === id) return;
    prefs.song = id;
    save();
    A.sfx.tap();
    setSong(id);
    homePreview();
    renderHome();
  }
  function pickWho(who) {
    if (prefs.who === who) return;
    prefs.who = who;
    save();
    A.sfx.tap();
    newLion();
    renderHome();
  }
  function play() {
    S.init();
    A.sfx.click();
    if (!prefs.storySeen) openStory('play');
    else startSong();
  }

  // ------------------------------------------------------------------ pause
  function pause() {
    if (G.state !== 'play') return;
    G.state = 'paused';
    clock.pause();
    S.suspend();
    ui.pause.classList.remove('hidden');
  }
  function resume() {
    if (G.state !== 'paused') return;
    ui.pause.classList.add('hidden');
    S.resume();
    clock.resume();
    G.state = 'play';
  }

  function toggleMute() {
    S.init();
    S.toggleMute();
  }

  // ------------------------------------------------------------------ toasts
  function toast(text, kind) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = text;
    ui.toasts.appendChild(el);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
    setTimeout(() => el.remove(), 2100);
  }

  // ------------------------------------------------------------------ layout
  function safe() {
    const cs = getComputedStyle(document.documentElement);
    const px = (v) => parseFloat(cs.getPropertyValue(v)) || 0;
    return { t: px('--safe-t'), b: px('--safe-b'), l: px('--safe-l'), r: px('--safe-r') };
  }
  function layout() {
    const w = innerWidth, h = innerHeight;
    LD.lanes.resize(w, h);
    if (G.state === 'end' || G.state === 'results') LD.stage.resize(w, h, panelFree());
    else if (G.state === 'play' || G.state === 'paused') {
      if (!G.players.length) return;
      G.lay = LD.lanes.layout(w, h, G.players.map((p) => ({ lanes: p.e.lanes })), safe());
      LD.stage.resize(w, h, G.lay.free);
      const pads = ui.pads.querySelectorAll('.pad');
      pads.forEach((el) => {
        const gp = G.lay.groups[+el.dataset.p], ln = gp.lanes[+el.dataset.l];
        const size = Math.min(ln.w - 8, gp.pad);
        Object.assign(el.style, { left: `${ln.cx - size / 2}px`, top: `${gp.padY}px`, width: `${size}px`, height: `${gp.pad}px` });
      });
      const bb = G.lay.buddy;
      Object.assign(ui.buddyBtn.style, { left: `${bb.x}px`, top: `${bb.y}px`, width: `${bb.size}px`, height: `${bb.size}px` });
    } else LD.stage.resize(w, h, panelFree());
  }
  // the home and results panels cover the right side (wide) or the bottom (tall): the lion dances in the rest
  function panelFree() {
    const w = innerWidth, h = innerHeight;
    return w >= h * 1.1 ? { x: 0, y: 0, w: w * 0.4, h } : { x: 0, y: 0, w, h: h * 0.42 };
  }

  // ------------------------------------------------------------------ input
  function bindInput() {
    const tap = (el, fn) => el.addEventListener('click', (e) => { e.preventDefault(); S.init(); fn(); });
    tap(ui.playBtn, play);
    tap(ui.storyBtn, () => { A.sfx.click(); openStory(null); });
    tap(ui.storyGo, () => { A.sfx.click(); closeStory(); });
    tap(ui.pauseBtn, pause);
    tap(ui.muteBtn, toggleMute);
    tap(ui.pResume, resume);
    tap(ui.pRestart, () => { ui.pause.classList.add('hidden'); S.resume(); startSong(); });
    tap(ui.pHome, () => { S.resume(); goHome(); });
    tap(ui.rAgain, startSong);
    tap(ui.rNext, () => { const i = SG.SONGS.findIndex((s) => s.id === prefs.song); prefs.song = SG.SONGS[(i + 1) % SG.SONGS.length].id; save(); setSong(prefs.song); startSong(); });
    tap(ui.rHome, goHome);
    ui.buddyBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); callBrother(); });
    for (const b of ui.who.querySelectorAll('button')) tap(b, () => pickWho(b.dataset.who));
    for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => S.init(), { capture: true });

    window.addEventListener('keydown', (e) => {
      if (Kit.help && Kit.help.isOpen && Kit.help.isOpen()) return;
      const k = e.code;
      if (k === 'KeyM') { if (!e.repeat) toggleMute(); e.preventDefault(); return; }
      if (G.state === 'play') {
        if (k === 'KeyP' || k === 'Escape') { pause(); e.preventDefault(); return; }
        if (k === 'KeyT' || k === 'Enter' || k === 'NumpadEnter') { if (!e.repeat) callBrother(); e.preventDefault(); return; }
        const kl = keyLane(k);
        if (kl) { e.preventDefault(); if (!e.repeat) press(kl[0], kl[1]); }
        return;
      }
      if (G.state === 'paused') {
        if (k === 'KeyP' || k === 'Escape' || k === 'Enter' || k === 'Space') { resume(); e.preventDefault(); }
        return;
      }
      if (G.state === 'story') {
        if (k === 'Enter' || k === 'Space' || k === 'Escape') { closeStory(); e.preventDefault(); }
        return;
      }
      if (G.state === 'results') {
        if (k === 'Enter' || k === 'Space') { startSong(); e.preventDefault(); }
        else if (k === 'KeyN') ui.rNext.click();
        else if (k === 'Escape' || k === 'KeyH') goHome();
        return;
      }
      if (G.state !== 'home') return;
      const i = SG.SONGS.findIndex((s) => s.id === prefs.song);
      if (k === 'ArrowLeft' || k === 'KeyA') pickSong(SG.SONGS[(i + SG.SONGS.length - 1) % SG.SONGS.length].id);
      else if (k === 'ArrowRight' || k === 'KeyD') pickSong(SG.SONGS[(i + 1) % SG.SONGS.length].id);
      else if (k === 'Digit1') pickWho('teddy');
      else if (k === 'Digit2') pickWho('tommy');
      else if (k === 'Digit3') pickWho('both');
      else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'KeyW' || k === 'KeyS') {
        const id = prefs.who === 'both' ? (k === 'KeyW' || k === 'KeyS' ? 'teddy' : 'tommy') : prefs.who;
        prefs.levels[id] = k === 'ArrowUp' || k === 'KeyW' ? 'easy' : 'normal';
        save();
        A.sfx.tap();
        renderHome();
      } else if (k === 'KeyB') { openStory(null); }
      else if (k === 'Enter' || k === 'Space') { e.preventDefault(); play(); }
    });

    document.addEventListener('visibilitychange', () => { if (document.hidden && !G.held) pause(); });
    window.addEventListener('resize', layout);
    S.onMute(() => { /* everything sounds through Kit.sound, so the switch already covers the music */ });
  }

  // ------------------------------------------------------------------ boot
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (G.held) return;
    frame(dt);
    LD.stage.render();
  }

  function boot() {
    for (const id of ['home', 'songs', 'who', 'lvls', 'playBtn', 'storyBtn', 'hud', 'pills', 'progressFill', 'pauseBtn', 'muteBtn', 'pads', 'buddyBtn', 'buddyFace', 'fiveIcon', 'buddyKey',
      'toasts', 'bigCount', 'songName', 'pause', 'pResume', 'pRestart', 'pHome', 'results', 'rHead', 'rCols', 'rAgain', 'rNext', 'rHome', 'story', 'storyGo', 'logo', 'loading']) ui[id] = $(id);
    const words = NAME.split(' ');
    ui.logo.querySelector('small').textContent = words[0];
    ui.logo.querySelector('big').textContent = words.slice(1).join(' ');
    ui.logo.setAttribute('data-no-lang', '');
    const zh = ui.logo.querySelector('.zhname');
    const langName = () => { zh.textContent = Kit.lang.is('zh') ? '舞狮' : ''; zh.style.display = Kit.lang.is('zh') ? 'block' : 'none'; };
    langName();
    Kit.lang.onChange(langName);
    Kit.lang.setup({ button: { top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: 'calc(max(10px, env(safe-area-inset-left, 0px)) + 48px)' } });

    LD.stage.init($('game'));
    LD.lanes.init($('lanes'));
    faces = Kit.portraits(['teddy', 'tommy', 'foxy', 'froggy'].map((id) => Kit.roster.get(id)), { size: 160 });
    const imgs = ui.who.querySelectorAll('img');
    imgs[0].src = faces.teddy;
    imgs[1].src = faces.tommy;
    imgs[2].src = faces.teddy;
    imgs[3].src = faces.tommy;
    LD.buddy.init({
      lion: () => G.lion,
      sfx: { buddy: A.sfx.buddy, land: () => S.land() },
      toast,
      drum(sec) { const t = clock.now(); for (const p of G.players) E.boost(p.e, t + sec); },
      treat(emoji, label, name) {
        toast(`${emoji} ${label} FROM ${name}!`, 'treat');
        LD.lion.chomp(G.lion);
        A.sfx.treat();
        for (const p of G.players) E.treat(p.e);
      },
      highFive() {
        LD.lion.highFive(G.lion);
        A.sfx.highFive();
        toast('HIGH FIVE!', 'buddy');
        const at = LD.lion.headWorld(G.lion);
        at.x -= 1.2;
        at.y += 0.8;
        LD.stage.burst('✋', at, 2, { speed: 0.6, up: 2.5, size: 0.7, life: 1, g: 3 });
      },
    });
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    bindInput();
    setSong(prefs.song);
    G.state = 'home';
    goHome();
    LD.stage.update(0, 0, G.lion, { snap: true, look: { h: 4.4, w: 4.6 }, ahead: 0.5, fx: 0.5 });
    ui.loading.style.opacity = '0';
    setTimeout(() => ui.loading.remove(), 450);
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------ for tests
  function state() {
    return {
      state: G.state, t: +(G.t || 0).toFixed(3), song: G.song && G.song.id, who: prefs.who, solo: G.solo,
      players: G.players.map((p) => ({ id: p.id, role: p.role, level: p.level, score: p.e.score, stars: E.stars(p.e), combo: p.e.combo, counts: Object.assign({}, p.e.counts), failed: p.e.failed, meter: +p.e.meter.toFixed(3), notes: p.e.notes.length, boost: +(p.e.boost - (G.t || 0)).toFixed(2) })),
      lion: G.lion && { x: +G.lion.x.toFixed(3), y: +G.lion.y.toFixed(3), costume: G.lion.costume, lift: +G.lion.lift.toFixed(2), sleep: +G.lion.sleep.toFixed(2) },
      buddy: LD.buddy.info(), outcome: G.outcome && { ok: G.outcome.ok, win: G.outcome.win, rows: G.outcome.rows.map((r) => ({ id: r.id, stars: r.stars, score: r.score })) },
      clock: clock.mode(), scheduled: A.played.length,
    };
  }
  // The music that really got scheduled (on the audio clock) against the song: every drum, cymbal and gong under a
  // note sounded at its note's time. Only meaningful after playing with the sound running (muted is fine).
  function soundCheck() {
    const song = G.song, played = A.played;
    if (!played.length) return { ok: false, why: 'nothing scheduled (sound not running?)' };
    const from = played[0].t, to = played[played.length - 1].t;
    const want = song.events.filter((e) => e.t >= from - 1e-6 && e.t <= to + 1e-6);
    const missing = want.filter((e) => !played.some((p) => p.kind === e.kind && Math.abs(p.t - e.t) < 1e-6));
    const notes = G.players.flatMap((p) => p.e.notes).filter((n) => n.t >= from && n.t <= to);
    const silent = notes.filter((n) => !played.some((p) => p.kind === n.inst && Math.abs(p.t - n.t) < 1e-6));
    const spacing = played.slice(1).every((p, i) => Math.abs((p.at - played[i].at) - (p.t - played[i].t)) < 0.002);
    return { ok: !missing.length && !silent.length && spacing, scheduled: played.length, wanted: want.length, missing: missing.length, silentNotes: silent.length, notes: notes.length, onAudioClock: spacing, from: +from.toFixed(2), to: +to.toFixed(2) };
  }

  window.game = {
    start(o = {}) {
      if (o.song) prefs.song = o.song;
      if (o.who) prefs.who = o.who;
      if (o.levels) Object.assign(prefs.levels, o.levels);
      if (o.level) for (const id of ['teddy', 'tommy']) prefs.levels[id] = o.level;
      prefs.storySeen = true;
      if (G.song && G.song.id !== prefs.song) setSong(prefs.song);
      startSong();
      return state();
    },
    hold(on = true) { G.held = !!on; clock.seek(clock.now()); last = performance.now(); },
    step(sec = 1 / 60) {
      if (!G.held) this.hold(true);
      const n = Math.max(1, Math.round(sec * 60));
      for (let i = 0; i < n; i++) { G.vt += 1 / 60; frame(1 / 60); }
      LD.stage.render();
      return state();
    },
    autopilot(on = true) { G.auto = !!on; },
    press(pi = 0, lane = 0) { return press(pi, lane); },
    call() { callBrother(); return LD.buddy.info(); },
    pause, resume, home: goHome, story: () => openStory(null), closeStory, results: () => G.outcome && showResults(),
    state, soundCheck,
    check: () => LD.checks.run({ prove: false }),
    prove: () => LD.checks.run({ prove: true }),
    get G() { return G; },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
