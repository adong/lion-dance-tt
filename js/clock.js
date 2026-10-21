/* TT Lion Dance: the song clock (the same design as TT Dance Party's). Song time is seconds from the song's first
   beat (negative during the count-in). While the sound is running it follows the AudioContext clock, so the notes
   on screen and the music never drift apart; when the sound is suspended (no tap yet, the tab asleep, the ? panel
   open) it carries on from performance.now() instead, and picks the audio clock up again without a jump.
   Paused, it stands still. It never runs backwards.
   The time sources are passed in:  audio() -> { running, t } or null,   perf() -> seconds. */
(function () {
  'use strict';
  const LD = (window.LD = window.LD || {});

  function create(src) {
    let paused = true, last = 0, mode = null, aAnchor = 0, haveAnchor = false, pAnchor = 0;
    let lastA = -1, lastAP = 0, lastP = 0; // smooth the audio clock between its updates (it ticks in buffers of a few ms)

    function now() {
      if (paused) return last;
      const a = src.audio(), p = src.perf();
      let t;
      if (a && a.running) {
        if (mode !== 'audio') {
          // back on the audio clock: keep the old anchor if it still agrees (a pause that suspended the audio too),
          // so the music already scheduled stays in step; otherwise pin the audio clock to where we are now
          if (!(haveAnchor && Math.abs(a.t - aAnchor - last) < 0.06)) aAnchor = a.t - last;
          haveAnchor = true;
          mode = 'audio';
          lastA = -1;
        }
        if (a.t !== lastA) { lastA = a.t; lastAP = p; }
        t = a.t - aAnchor + Math.min(0.03, Math.max(0, p - lastAP));
      } else {
        if (mode !== 'perf') { pAnchor = (mode === 'audio' ? lastP : p) - last; mode = 'perf'; }
        t = p - pAnchor;
      }
      lastP = p;
      if (t > last) last = t;
      return last;
    }

    return {
      now,
      start(t0) { last = t0; paused = false; mode = null; haveAnchor = false; now(); },
      pause() { if (!paused) { now(); paused = true; mode = null; } },
      resume() { if (paused) { paused = false; mode = null; now(); } },
      seek(t) { last = t; mode = null; haveAnchor = false; },
      // tests: move the song on by dt seconds, off the real clocks
      advance(dt) { last += dt; mode = null; haveAnchor = false; },
      isPaused: () => paused,
      mode: () => (paused ? 'paused' : mode),
      toAudio: (t) => aAnchor + t, // the AudioContext time at which song time t sounds (on the audio clock only)
      onAudio: () => !paused && mode === 'audio',
    };
  }

  LD.clock = { create };
})();
