/* TT Lion Dance: the sound. Every drum, cymbal, gong and tune note is a Kit.sound.tone / hiss, so the kit's sound
   switch (M, the speaker buttons, the ? panel) mutes the music too, and there are no audio files.
   To keep the notes on screen in step with the music, songs are scheduled ahead on the AudioContext clock (`when`)
   by a small look-ahead scheduler that reads the song clock (js/clock.js). The kit doesn't hand out its
   AudioContext, so this file wraps the AudioContext constructor before the kit makes one (Kit.sound.init runs on the
   first tap or key, after every script has loaded) and keeps a reference, as TT Dance Party does. */
(function () {
  'use strict';
  const LD = (window.LD = window.LD || {});
  const S = Kit.sound;

  const A = (LD.audio = { ctx: null, played: [] });
  const Native = window.AudioContext || window.webkitAudioContext;
  if (Native) {
    const Wrapped = function (opts) {
      const c = opts ? new Native(opts) : new Native();
      A.ctx = c;
      return c;
    };
    Wrapped.prototype = Native.prototype;
    window.AudioContext = Wrapped;
    if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
  }
  A.running = () => !!A.ctx && A.ctx.state === 'running';
  A.source = () => (A.ctx ? { running: A.running(), t: A.ctx.currentTime } : null);

  // ------------------------------------------------------------------ the band
  const MUSIC = 0.32;
  const LEADS = {
    flute(when, f, dur, v) {
      S.tone({ when, type: 'triangle', f, dur: dur + 0.05, vol: 0.17 * v, attack: 0.03 });
      S.tone({ when, f: f * 2, dur: dur * 0.8, vol: 0.03 * v, attack: 0.04 });
    },
    sheng(when, f, dur, v) {
      S.tone({ when, type: 'square', f, dur: dur + 0.05, vol: 0.05 * v, lp: 2200, attack: 0.02 });
      S.tone({ when, type: 'triangle', f: f * 1.5, dur, vol: 0.05 * v, attack: 0.03 });
    },
    suona(when, f, dur, v) {
      S.tone({ when, type: 'sawtooth', f, to: f * 1.004, dur: dur + 0.04, vol: 0.06 * v, lp: 2600, attack: 0.015 });
      S.tone({ when, type: 'square', f, dur, vol: 0.025 * v, lp: 1600, attack: 0.02 });
    },
  };

  function voice(e, when, song, m) {
    const v = MUSIC * m, acc = e.accent ? 1.15 : 1;
    switch (e.kind) {
      case 'd': // the big drum: a deep boom and the stick's thump
        S.tone({ when, f: 125, to: 52, dur: 0.38, vol: 0.95 * v * acc });
        S.hiss({ when, filter: 'lowpass', f: 900, dur: 0.07, vol: 0.3 * v });
        break;
      case 'r': // a soft roll on the drum's rim
        S.tone({ when, f: 165, to: 95, dur: 0.12, vol: 0.4 * v * (e.vol || 0.5) });
        break;
      case 'c': // the cymbals (镲): a bright clash
        S.hiss({ when, filter: 'highpass', f: 4800, dur: 0.5, vol: 0.26 * v * acc });
        S.hiss({ when, f: 3100, q: 2.5, dur: 0.22, vol: 0.2 * v });
        for (const f of [1630, 2410, 3370]) S.tone({ when, type: 'square', f, dur: 0.16, vol: 0.018 * v, lp: 7000 });
        break;
      case 'g': // the gong (锣): low, long, its pitch sinking a little
        [[98, 0.55, 2.2], [148, 0.26, 1.7], [197, 0.18, 1.3], [263, 0.1, 0.9]].forEach(([f, vol, dur]) =>
          S.tone({ when, f, to: f * 0.94, dur, vol: vol * v, attack: 0.008 }));
        S.hiss({ when, filter: 'lowpass', f: 700, dur: 1.3, vol: 0.12 * v, attack: 0.06 });
        break;
      case 'w': // the woodblock keeps the beat (louder for the count-in)
        S.tone({ when, type: 'square', f: e.count === 4 ? 1500 : 1150, dur: 0.03, vol: (e.count ? 0.08 : e.accent ? 0.03 : 0.02) * (e.count ? MUSIC : v) * 3, lp: 3800 });
        S.tone({ when, f: e.count === 4 ? 1100 : 880, dur: 0.05, vol: (e.count ? 0.25 : 0.07) * (e.count ? MUSIC : v) * 2 });
        break;
      case 'bass':
        S.tone({ when, type: 'triangle', f: e.f, dur: e.dur, vol: 0.36 * v, attack: 0.01 });
        break;
      case 'pluck': // a guzheng-ish plucked string
        S.tone({ when, type: 'triangle', f: e.f, dur: 0.28, vol: 0.06 * v });
        S.tone({ when, f: e.f * 2, dur: 0.08, vol: 0.025 * v });
        break;
      case 'lead':
        LEADS[song.def.lead](when, e.f, e.dur, v);
        break;
      case 'pad':
        for (const f of e.fs) S.tone({ when, type: 'triangle', f, dur: e.dur, vol: 0.07 * v, attack: 0.05 });
        break;
    }
  }

  // ------------------------------------------------------------------ playing a song against a clock
  const AHEAD = 0.2; // schedule this far ahead
  // { start(song, clock, { vol, loop }), stop(), tick() }. While the song clock isn't on the audio clock (sound off,
  // suspended, paused) nothing is scheduled and the events that fall due are skipped, so nothing plays late.
  // Every event really scheduled goes into A.played (song time and kind) for the tests: they check sound by data.
  function player() {
    let song = null, clock = null, idx = 0, vol = 1, loop = null;
    const seekIdx = (t) => {
      let i = 0;
      while (i < song.events.length && song.events[i].t < t - 1e-6) i++;
      return i;
    };
    return {
      start(s, c, o = {}) {
        song = s; clock = c; vol = o.vol == null ? 1 : o.vol; loop = o.loop || null;
        idx = seekIdx(clock.now());
        A.played.length = 0;
      },
      stop() { song = null; },
      playing: () => !!song,
      tick() {
        if (!song) return;
        let now = clock.now();
        if (loop && now >= loop.to) {
          clock.seek(loop.from + (now - loop.to));
          now = clock.now();
          idx = seekIdx(now);
        }
        const ev = song.events;
        if (!clock.onAudio() || !A.running()) {
          while (idx < ev.length && ev[idx].t < now + 0.02) idx++;
          return;
        }
        while (idx < ev.length && ev[idx].t < now + AHEAD) {
          const e = ev[idx++];
          if (e.t < now - 0.03) continue; // already gone by: never play anything late
          if (loop && e.t >= loop.to) continue;
          voice(e, clock.toAudio(e.t), song, vol);
          if (A.played.length < 4000) A.played.push({ t: e.t, kind: e.kind, at: clock.toAudio(e.t) });
        }
      },
    };
  }
  A.player = player;

  // ------------------------------------------------------------------ effects
  A.sfx = {
    hit(rating) {
      if (rating === 'PERFECT') S.tone({ type: 'triangle', f: 1568, dur: 0.08, vol: 0.05 });
      else if (rating === 'GREAT') S.tone({ type: 'triangle', f: 1319, dur: 0.07, vol: 0.04 });
    },
    oops() {
      S.tone({ type: 'square', f: 300, to: 160, dur: 0.14, vol: 0.04, lp: 1200 });
    },
    combo(n) {
      const k = Math.min(n / 50, 1);
      [784, 988, 1175, 1568].forEach((f, i) => S.tone({ type: 'triangle', f: f * (1 + k * 0.25), at: i * 0.05, dur: 0.14, vol: 0.05 }));
    },
    cheer(big) {
      S.hiss({ f: 1100, q: 0.4, dur: big ? 1.6 : 0.9, vol: big ? 0.15 : 0.08, attack: 0.25 });
      S.hiss({ filter: 'highpass', f: 3500, dur: big ? 1.2 : 0.6, vol: 0.05, attack: 0.2 });
    },
    firecrackers() {
      for (let i = 0; i < 14; i++) {
        S.hiss({ filter: 'highpass', f: 1800 + Math.random() * 1500, dur: 0.05, vol: 0.12 + Math.random() * 0.08, at: i * 0.07 + Math.random() * 0.03 });
        S.tone({ f: 220 + Math.random() * 80, to: 80, dur: 0.05, vol: 0.12, at: i * 0.07 });
      }
    },
    buddy() { S.jump(); S.powerup(); },
    treat() { S.coin(6); },
    chomp() { S.tone({ type: 'square', f: 220, to: 120, dur: 0.07, vol: 0.05, lp: 900 }); S.tone({ type: 'square', f: 200, to: 110, dur: 0.07, vol: 0.05, lp: 900, at: 0.12 }); },
    highFive() { S.hiss({ filter: 'highpass', f: 2200, dur: 0.07, vol: 0.25 }); S.coin(4); },
    fanfare(stars) {
      const notes = stars >= 3 ? [523, 659, 784, 1047, 1319] : stars >= 1 ? [523, 659, 784, 1047] : [392, 494, 587];
      notes.forEach((f, i) => S.tone({ type: 'square', f, at: i * 0.11, dur: 0.22, vol: 0.05, lp: 3000 }));
      notes.forEach((f, i) => S.tone({ type: 'triangle', f: f / 2, at: i * 0.11, dur: 0.22, vol: 0.12 }));
    },
    star(i) { S.tone({ type: 'triangle', f: 880 * Math.pow(1.26, i), dur: 0.25, vol: 0.12 }); },
    tap() { S.tone({ type: 'square', f: 660, dur: 0.04, vol: 0.04, lp: 3000 }); },
    // a pad tapped with nothing to hit still sounds like its instrument, quietly
    pad(inst) {
      if (inst === 'd') S.tone({ f: 125, to: 60, dur: 0.2, vol: 0.18 });
      else if (inst === 'c') S.hiss({ filter: 'highpass', f: 5000, dur: 0.2, vol: 0.06 });
      else S.tone({ f: 150, to: 140, dur: 0.6, vol: 0.08 });
    },
    click() { S.click(); },
  };
})();
