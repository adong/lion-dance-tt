/* TT Lion Dance: the note lanes, drawn on a 2D canvas over the street. Drums, cymbals and gongs fall onto the
   targets just above the big pads. Also the layout (where the lanes, pads and the scene go on this screen), the
   instrument pictures (the pads use the same ones), the PERFECT / GREAT / OK pop-ups, sparkles and confetti.
   Canvas words go through Kit.lang.t. */
(function () {
  'use strict';
  const LD = (window.LD = window.LD || {});
  const L = (s) => Kit.lang.t(s);
  const FONT = Kit.gfx.FONT;

  let cv = null, g = null, W = 1, H = 1, dpr = 1;
  const pops = [], parts = [], confetti = [];
  const COLORS = { d: '#ff5a4a', c: '#ffd24a', g: '#ffa64a' };

  function init(canvas) { cv = canvas; g = cv.getContext('2d'); }
  function resize(w, h) {
    W = w; H = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }

  // ------------------------------------------------------------------ the instruments, drawn in a box of `size`
  function drawInst(c, inst, x, y, size, o = {}) {
    c.save();
    c.translate(x, y);
    c.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = size * 0.4; }
    const s = size;
    c.lineJoin = 'round';
    if (o.outline) {
      c.lineWidth = Math.max(3, s * 0.07);
      c.strokeStyle = o.outline;
      c.setLineDash([s * 0.12, s * 0.08]);
      c.beginPath();
      if (inst === 'g') c.arc(0, 0, s * 0.46, 0, Math.PI * 2);
      else if (inst === 'c') c.ellipse(0, 0, s * 0.48, s * 0.3, 0, 0, Math.PI * 2);
      else Kit.gfx.roundRect(c, -s * 0.44, -s * 0.36, s * 0.88, s * 0.72, s * 0.14);
      c.stroke();
      c.restore();
      return;
    }
    const ink = '#14121f';
    if (inst === 'd') {
      // the big drum from the side: red body, gold rims and studs, the skin on top
      c.fillStyle = ink;
      Kit.gfx.roundRect(c, -s * 0.46, -s * 0.3, s * 0.92, s * 0.68, s * 0.14);
      c.fill();
      const gr = c.createLinearGradient(-s * 0.4, 0, s * 0.4, 0);
      gr.addColorStop(0, '#a8181c');
      gr.addColorStop(0.45, '#ff4a3a');
      gr.addColorStop(1, '#b01c1c');
      c.fillStyle = gr;
      Kit.gfx.roundRect(c, -s * 0.4, -s * 0.24, s * 0.8, s * 0.56, s * 0.1);
      c.fill();
      c.fillStyle = '#ffc93c';
      c.fillRect(-s * 0.4, -s * 0.2, s * 0.8, s * 0.07);
      c.fillRect(-s * 0.4, s * 0.21, s * 0.8, s * 0.07);
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.arc(i * s * 0.11, -s * 0.165, s * 0.025, 0, 7); c.arc(i * s * 0.11, s * 0.245, s * 0.025, 0, 7); c.fill(); }
      c.fillStyle = ink;
      c.beginPath(); c.ellipse(0, -s * 0.26, s * 0.46, s * 0.17, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f6e2b6';
      c.beginPath(); c.ellipse(0, -s * 0.26, s * 0.4, s * 0.12, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.ellipse(-s * 0.12, -s * 0.29, s * 0.14, s * 0.04, 0, 0, Math.PI * 2); c.fill();
    } else if (inst === 'c') {
      // a cymbal, tilted: a gold disc with a dome in the middle
      c.fillStyle = ink;
      c.beginPath(); c.ellipse(0, 0, s * 0.5, s * 0.32, -0.15, 0, Math.PI * 2); c.fill();
      const gr = c.createRadialGradient(-s * 0.12, -s * 0.08, s * 0.02, 0, 0, s * 0.48);
      gr.addColorStop(0, '#fff6c0');
      gr.addColorStop(0.5, '#ffd24a');
      gr.addColorStop(1, '#d89422');
      c.fillStyle = gr;
      c.beginPath(); c.ellipse(0, 0, s * 0.44, s * 0.26, -0.15, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(160,96,20,0.6)';
      c.lineWidth = s * 0.025;
      c.beginPath(); c.ellipse(0, 0, s * 0.3, s * 0.17, -0.15, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#e8a83a';
      c.beginPath(); c.ellipse(0, -s * 0.02, s * 0.11, s * 0.08, -0.15, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c8261e';
      c.fillRect(-s * 0.03, -s * 0.24, s * 0.06, s * 0.16);
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = s * 0.03;
      c.beginPath(); c.moveTo(s * 0.18, -s * 0.16); c.lineTo(s * 0.3, -s * 0.12); c.stroke();
    } else {
      // the gong: a bronze disc with a raised middle, hung on a red string
      c.strokeStyle = '#c8261e';
      c.lineWidth = s * 0.05;
      c.beginPath(); c.moveTo(-s * 0.2, -s * 0.36); c.lineTo(0, -s * 0.5); c.lineTo(s * 0.2, -s * 0.36); c.stroke();
      c.fillStyle = ink;
      c.beginPath(); c.arc(0, 0, s * 0.47, 0, Math.PI * 2); c.fill();
      const gr = c.createRadialGradient(-s * 0.14, -s * 0.14, s * 0.03, 0, 0, s * 0.44);
      gr.addColorStop(0, '#ffe3a0');
      gr.addColorStop(0.55, '#e0a040');
      gr.addColorStop(1, '#9a5a1a');
      c.fillStyle = gr;
      c.beginPath(); c.arc(0, 0, s * 0.41, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(90,40,10,0.55)';
      c.lineWidth = s * 0.03;
      c.beginPath(); c.arc(0, 0, s * 0.3, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#c07a2a';
      c.beginPath(); c.arc(0, 0, s * 0.12, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.beginPath(); c.arc(-s * 0.05, -s * 0.05, s * 0.04, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  const icons = {};
  function icon(inst) {
    if (icons[inst]) return icons[inst];
    const [c, x] = Kit.gfx.makeCanvas(160, 160);
    drawInst(x, inst, 80, 84, 140);
    return (icons[inst] = c.toDataURL('image/png'));
  }

  // ------------------------------------------------------------------ layout
  // groups: one per player, each { lanes: ['d', 'g', 'c'] }. Returns where everything goes, in CSS pixels.
  function layout(w, h, groups, safe = { t: 0, b: 0, l: 0, r: 0 }) {
    const n = groups.reduce((a, gp) => a + gp.lanes.length, 0);
    const wide = w >= h * 1.1;
    const out = { wide, groups: [], free: null, buddy: null };
    if (!wide) {
      const top = Math.round(h * 0.47);
      const avail = w - 24 - safe.l - safe.r - (groups.length > 1 ? 22 : 0);
      const laneW = Math.min(132, Math.floor(avail / n));
      const pad = Math.max(60, Math.min(laneW - 8, h * 0.12, 118));
      const padY = h - safe.b - 10 - pad;
      let x = groups.length > 1 ? 12 + safe.l : Math.round((w - laneW * n) / 2);
      groups.forEach((gp, i) => {
        if (i === 1) x = w - 12 - safe.r - laneW * gp.lanes.length;
        out.groups.push(group(gp, x, laneW, top, padY, pad));
        x += laneW * gp.lanes.length;
      });
      out.free = { x: 0, y: 0, w, h: top + 10 };
      const bs = Math.round(Math.min(82, Math.max(60, h * 0.085)));
      out.buddy = { x: 12 + safe.l, y: top - bs - 12, size: bs };
    } else {
      const top = 64 + safe.t;
      const laneW = Math.round(Math.min(124, Math.max(66, h * 0.24), (w * 0.62) / n));
      const pad = Math.max(54, Math.min(laneW - 8, h * 0.2, 112));
      const padY = h - safe.b - 8 - pad;
      const bs = Math.round(Math.min(80, Math.max(56, h * 0.17)));
      if (groups.length === 1) {
        const gw = laneW * n, x = w - 12 - safe.r - gw;
        out.groups.push(group(groups[0], x, laneW, top, padY, pad));
        out.buddy = { x: x - bs - 14, y: h - safe.b - bs - 14, size: bs };
        out.free = { x: 0, y: 0, w: x - bs - 20, h };
      } else {
        const l = groups[0], r = groups[1];
        const x0 = 12 + safe.l, x1 = w - 12 - safe.r - laneW * r.lanes.length;
        out.groups.push(group(l, x0, laneW, top, padY, pad));
        out.groups.push(group(r, x1, laneW, top, padY, pad));
        const left = x0 + laneW * l.lanes.length;
        out.buddy = { x: Math.round((left + x1) / 2 - bs / 2), y: h - safe.b - bs - 12, size: bs };
        out.free = { x: left, y: 0, w: x1 - left, h };
      }
    }
    return out;
  }
  function group(gp, x, laneW, top, padY, pad) {
    const lanes = gp.lanes.map((inst, i) => ({ inst, x: x + i * laneW, w: laneW, cx: x + i * laneW + laneW / 2 }));
    const note = Math.min(laneW * 0.74, 92);
    return { x, w: laneW * gp.lanes.length, top, padY, pad, target: padY - 10 - note * 0.5, note, lanes };
  }

  // ------------------------------------------------------------------ drawing a frame
  // view = { lay, players: [{ engine p, lead (seconds of fall), boost (bool), out (bool) }], t (song time), flash: [[lane flashes]] }
  function draw(view) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (view && view.lay) view.lay.groups.forEach((gp, i) => drawGroup(gp, view.players[i], view.t, view.flash ? view.flash[i] : null));
    drawPops();
  }

  function drawGroup(gp, pl, t, flash) {
    if (!pl) return;
    const p = pl.p;
    g.save();
    // the lane columns
    g.globalAlpha = pl.out ? 0.4 : 1;
    gp.lanes.forEach((ln, i) => {
      g.fillStyle = i % 2 ? 'rgba(30, 12, 26, 0.52)' : 'rgba(40, 16, 30, 0.6)';
      Kit.gfx.roundRect(g, ln.x + 3, gp.top, ln.w - 6, gp.padY - gp.top - 4, 16);
      g.fill();
      if (flash && flash[i] > 0) {
        g.fillStyle = `rgba(255, 220, 120, ${flash[i] * 0.35})`;
        Kit.gfx.roundRect(g, ln.x + 3, gp.top, ln.w - 6, gp.padY - gp.top - 4, 16);
        g.fill();
      }
    });
    if (pl.boost) {
      g.strokeStyle = 'rgba(255, 212, 0, 0.9)';
      g.lineWidth = 4;
      g.shadowColor = '#ffd400';
      g.shadowBlur = 16;
      Kit.gfx.roundRect(g, gp.x + 1, gp.top - 2, gp.w - 2, gp.padY - gp.top, 18);
      g.stroke();
      g.shadowBlur = 0;
    }
    // the target line and the targets
    g.fillStyle = 'rgba(255, 255, 255, 0.18)';
    g.fillRect(gp.x + 6, gp.target - 2, gp.w - 12, 4);
    const single = gp.lanes.length;
    gp.lanes.forEach((ln) => drawInst(g, ln.inst, ln.cx, gp.target, gp.note, { outline: 'rgba(255,255,255,0.75)' }));
    // the notes, latest first so the next one is on top
    const span = gp.target - gp.top - gp.note * 0.3;
    const notes = p.notes;
    for (let i = notes.length - 1; i >= p.next; i--) {
      const n = notes[i];
      const dt = n.t - t;
      if (dt > pl.lead) continue;
      if (n.judged && n.judged !== 'miss') continue;
      const y = gp.target - (dt / pl.lead) * span;
      if (y < gp.top - gp.note * 0.2) continue;
      const missed = n.judged === 'miss' || dt < -0.25;
      if (missed && dt < -0.4) continue;
      let x, size = gp.note;
      if (n.lane === -1) {
        // a gong any pad can hit: drawn big across the lanes
        x = gp.x + gp.w / 2;
        size = single > 1 ? Math.min(gp.w * 0.62, gp.note * 1.35) : gp.note * 1.08;
        if (single > 1 && !missed) {
          g.fillStyle = 'rgba(255, 166, 74, 0.25)';
          Kit.gfx.roundRect(g, gp.x + 8, y - gp.note * 0.36, gp.w - 16, gp.note * 0.72, gp.note * 0.36);
          g.fill();
        }
      } else x = gp.lanes[n.lane].cx;
      const a = missed ? 0.35 : Math.min(1, (pl.lead - dt) / 0.25);
      drawInst(g, n.inst, x, y, size, { alpha: a, glow: pl.boost && !missed ? '#ffe680' : null });
      if (n.lane === -1 && single > 1 && !missed && dt < pl.lead * 0.85) {
        g.font = `${Math.round(gp.note * 0.2)}px ${FONT}`;
        g.textAlign = 'center';
        g.lineWidth = 4;
        g.strokeStyle = '#14121f';
        g.fillStyle = '#fff';
        g.globalAlpha = a;
        g.strokeText(L('ANY PAD!'), x, y + size * 0.62);
        g.fillText(L('ANY PAD!'), x, y + size * 0.62);
        g.globalAlpha = pl.out ? 0.4 : 1;
      }
    }
    // the combo
    if (p.combo >= 5) {
      g.font = `${Math.round(Math.min(34, gp.note * 0.36))}px ${FONT}`;
      g.textAlign = 'center';
      g.lineWidth = 5;
      g.strokeStyle = '#14121f';
      g.fillStyle = '#7df7c8';
      const s = L(`${p.combo} COMBO`);
      g.strokeText(s, gp.x + gp.w / 2, gp.top + 34);
      g.fillText(s, gp.x + gp.w / 2, gp.top + 34);
    }
    g.restore();
  }

  // ------------------------------------------------------------------ pop-ups, sparkles, confetti
  const RATE = { PERFECT: ['PERFECT!', '#ffe14a'], GREAT: ['GREAT!', '#7df7c8'], OK: ['OK!', '#9fd0ff'], miss: ['OOPS', '#ff8fb5'] };
  function pop(rating, x, y) {
    const [text, color] = RATE[rating];
    pops.push({ text, color, x: Math.max(70, Math.min(W - 70, x)), y, t: 0, big: rating === 'PERFECT' });
    if (rating !== 'miss') for (let i = 0; i < (rating === 'PERFECT' ? 12 : 7); i++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 200;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, t: 0, life: 0.45 + Math.random() * 0.25, c: rating === 'PERFECT' ? '#ffe14a' : '#ffffff' });
    }
  }
  function party() {
    const cols = ['#ff3d3d', '#ffd400', '#ff8a1f', '#ff6fa8', '#ffffff', '#3fe0b0'];
    for (let i = 0; i < 160; i++) confetti.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 140, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, c: cols[i % cols.length], w: 7 + Math.random() * 6, t: 0 });
  }
  function clear() { pops.length = parts.length = confetti.length = 0; }

  function tick(dt) {
    for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].t += dt) > 0.7) pops.splice(i, 1);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt;
      if (p.t > p.life) parts.splice(i, 1);
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.t += dt; c.x += c.vx * dt + Math.sin(c.t * 3 + i) * 30 * dt; c.y += c.vy * dt; c.r += c.vr * dt;
      if (c.y > H + 30) confetti.splice(i, 1);
    }
  }

  function drawPops() {
    for (const p of parts) {
      g.globalAlpha = Math.max(0, 1 - p.t / p.life);
      g.fillStyle = p.c;
      g.beginPath();
      g.arc(p.x, p.y, 4, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    for (const p of pops) {
      const u = p.t / 0.7;
      const s = (p.big ? 30 : 24) * (u < 0.15 ? 0.6 + u * 3 : 1);
      g.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
      g.font = `${Math.round(s)}px ${FONT}`;
      g.textAlign = 'center';
      g.lineWidth = 6;
      g.strokeStyle = '#14121f';
      g.fillStyle = p.color;
      const text = L(p.text);
      g.strokeText(text, p.x, p.y - u * 40);
      g.fillText(text, p.x, p.y - u * 40);
    }
    g.globalAlpha = 1;
    for (const c of confetti) {
      g.save();
      g.translate(c.x, c.y);
      g.rotate(c.r);
      g.fillStyle = c.c;
      g.fillRect(-c.w / 2, -3, c.w, 6);
      g.restore();
    }
  }

  LD.lanes = { init, resize, layout, draw, tick, pop, party, clear, drawInst, icon, COLORS };
})();
