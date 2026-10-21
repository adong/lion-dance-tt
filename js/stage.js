/* TT Lion Dance: the festival street at dusk. A red wall with a tiled roof, strings of red lanterns, plum trees in
   bloom, the plum-blossom poles (梅花桩) with flower-shaped tops, the green (采青: a lettuce tied with a red
   envelope) hanging high over the last pole, and the band's drum cart with the big drum, a gong and cymbals,
   which rolls along with the lion. The camera follows the lion and keeps it in the part of the screen the note
   lanes leave free. Our own art, all made of boxes, spheres and canvas textures. */
(function () {
  'use strict';
  const T = THREE;
  const LD = (window.LD = window.LD || {});
  const G = Kit.gfx;
  const { std, mesh, makeCanvas, toTexture } = G;

  const ST = (LD.stage = { scene: null, camera: null, renderer: null });
  let poleGroup = null, green = null, cart = null, drumSkin = null, gongDisc = null, cymbals = [], lanterns = [], parts = [];
  let blob = null, W = 1, H = 1, free = { x: 0, y: 0, w: 1, h: 1 };
  const cam = { x: 0, y: 2.6, d: 14 };
  const kick = { drum: 0, gong: 0, cym: 0 };

  function skyTexture() {
    const [c, g] = makeCanvas(16, 256);
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#1a1240');
    gr.addColorStop(0.45, '#5a2a6e');
    gr.addColorStop(0.75, '#c8506a');
    gr.addColorStop(1, '#ffae5e');
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 256);
    return toTexture(c);
  }

  function tileTexture() {
    const [c, g] = makeCanvas(128, 128);
    g.fillStyle = '#8f7a78';
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = 0.85 + ((x * 7 + y * 13) % 5) * 0.04;
      g.fillStyle = `rgb(${Math.round(176 * v)}, ${Math.round(152 * v)}, ${Math.round(146 * v)})`;
      G.roundRect(g, x * 32 + 2, y * 32 + 2, 28, 28, 4);
      g.fill();
    }
    const t = toTexture(c, true);
    t.repeat.set(30, 11);
    return t;
  }

  // the red wall's pattern: gold trim and round windows
  function wallTexture() {
    const [c, g] = makeCanvas(256, 128);
    g.fillStyle = '#b8282a';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#e0a83a';
    g.fillRect(0, 8, 256, 6);
    g.fillRect(0, 114, 256, 6);
    g.strokeStyle = '#e0a83a';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(128, 62, 30, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#3a0e1c';
    g.beginPath();
    g.arc(128, 62, 26, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#e0a83a';
    g.lineWidth = 3;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(128 + i * 12, 38); g.lineTo(128 + i * 12, 86); g.stroke(); }
    g.beginPath(); g.moveTo(102, 62); g.lineTo(154, 62); g.stroke();
    const t = toTexture(c, true);
    t.repeat.set(16, 1);
    return t;
  }

  // a plum-blossom shape: five round petals around the middle
  function blossomShape(r) {
    const s = new T.Shape();
    const n = 5, pr = r * 0.48;
    for (let i = 0; i <= n * 12; i++) {
      const a = (i / (n * 12)) * Math.PI * 2;
      const k = Math.abs(Math.cos((a * n) / 2));
      const rr = r - pr + pr * Math.pow(k, 0.6) * 1.0;
      const x = Math.cos(a + Math.PI / 2) * rr, y = Math.sin(a + Math.PI / 2) * rr;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    return s;
  }

  function lantern(x, y, z, parent) {
    const g = new T.Group();
    g.position.set(x, y, z);
    const red = std('#e8262b', { emissive: '#ff3a1a', emissiveIntensity: 0.55, roughness: 0.5 });
    const gold = std('#ffc93c', { metalness: 0.4, roughness: 0.4 });
    const body = mesh(new T.SphereGeometry(0.42, 16, 12), red, 0, 0, 0, g, false);
    body.scale.set(1, 0.82, 1);
    mesh(new T.CylinderGeometry(0.2, 0.24, 0.1, 12), gold, 0, 0.36, 0, g, false);
    mesh(new T.CylinderGeometry(0.24, 0.2, 0.1, 12), gold, 0, -0.36, 0, g, false);
    const tassel = mesh(new T.BoxGeometry(0.06, 0.4, 0.06), std('#ffd84a'), 0, -0.6, 0, g, false);
    tassel.userData.sway = true;
    const glow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: '#ff7a30', transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending }));
    glow.scale.setScalar(2.2);
    g.add(glow);
    parent.add(g);
    return g;
  }

  function plumTree(x, z, s, parent) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    const bark = std('#4a2a24');
    const trunk = mesh(new T.CylinderGeometry(0.16, 0.24, 3, 8), bark, 0, 1.5, 0, g, false);
    trunk.rotation.z = 0.1;
    const b1 = mesh(new T.CylinderGeometry(0.07, 0.12, 2, 6), bark, 0.6, 3.1, 0, g, false);
    b1.rotation.z = -0.8;
    const b2 = mesh(new T.CylinderGeometry(0.07, 0.12, 1.8, 6), bark, -0.6, 3.2, 0, g, false);
    b2.rotation.z = 0.7;
    const pinks = [std('#ff9cc8', { emissive: '#ff6fa8', emissiveIntensity: 0.25 }), std('#ffe3f0', { emissive: '#ffc3dc', emissiveIntensity: 0.2 })];
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39, r = 0.4 + (i % 7) * 0.2;
      mesh(new T.IcosahedronGeometry(0.16 + (i % 3) * 0.05, 0), pinks[i % 2], Math.cos(a) * r * 1.6, 3.2 + Math.sin(a * 1.7) * 0.8 + (i % 4) * 0.12, Math.sin(a) * r * 0.6, g, false);
    }
    parent.add(g);
  }

  function init(canvas) {
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new T.Scene();
    scene.background = skyTexture();
    scene.fog = new T.Fog('#5a2a5a', 26, 60);
    const camera = new T.PerspectiveCamera(40, 1, 0.1, 200);
    Object.assign(ST, { scene, camera, renderer });

    scene.add(new T.HemisphereLight('#ffe0b8', '#40203a', 0.85));
    const sun = new T.DirectionalLight('#ffd2a0', 0.9);
    sun.position.set(-4, 10, 8);
    scene.add(sun);
    const fill = new T.DirectionalLight('#ff9a70', 0.35);
    fill.position.set(6, 3, -6);
    scene.add(fill);

    // the street
    const ground = mesh(new T.PlaneGeometry(120, 44), std('#ffffff', { map: tileTexture(), roughness: 0.95 }), 24, 0, 13, scene, false);
    ground.rotation.x = -Math.PI / 2;
    const wall = mesh(new T.BoxGeometry(120, 4.2, 0.6), std('#ffffff', { map: wallTexture(), roughness: 0.8 }), 24, 2.1, -7.5, scene, false);
    wall.userData.fixed = true;
    const roof = std('#3b3f5c', { roughness: 0.6 });
    mesh(new T.BoxGeometry(120, 0.3, 1.6), roof, 24, 4.35, -7.3, scene, false);
    const cap = mesh(new T.CylinderGeometry(0.22, 0.22, 120, 8), std('#2b2e46'), 24, 4.55, -7.3, scene, false);
    cap.rotation.z = Math.PI / 2;
    for (let x = -18; x < 70; x += 6) {
      // little upturned roof corners and gold studs along the wall
      const c = mesh(new T.ConeGeometry(0.22, 0.6, 6), std('#e0a83a'), x, 4.75, -6.6, scene, false);
      c.rotation.x = 0.6;
    }
    for (let x = -16; x < 70; x += 9) plumTree(x + 2, -9.4, 1.1 + ((x + 16) % 3) * 0.15, scene);

    // lanterns on strings across the street
    const wire = std('#2a1a1a');
    for (let x = -20; x < 72; x += 2.6) {
      const y = 6.6 + Math.sin(x * 0.7) * 0.25, z = -3.4 + Math.cos(x * 0.45) * 0.6;
      lanterns.push(lantern(x, y, z, scene));
      const w = mesh(new T.BoxGeometry(2.6, 0.03, 0.03), wire, x + 1.3, y + 0.5, z, scene, false);
      w.rotation.z = 0.02;
    }

    // a soft shadow under the lion
    blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: G.radialTexture(64, [[0, 'rgba(20,10,20,0.55)'], [1, 'rgba(20,10,20,0)']]), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.scale.set(4.2, 2.2, 1);
    scene.add(blob);

    buildCart();
  }

  // The band's cart: the big drum (大鼓) on a red stand with wheels, a gong (锣) on a frame and a pair of cymbals (镲).
  function buildCart() {
    cart = new T.Group();
    const red = std('#c8262a'), wood = std('#7a3b22'), gold = std('#ffc93c', { metalness: 0.5, roughness: 0.35 }), dark = std('#2a1a1a');
    mesh(new T.BoxGeometry(2.6, 0.18, 1.3), wood, 0, 0.55, 0, cart);
    for (const [x, z] of [[-1, 0.62], [1, 0.62], [-1, -0.62], [1, -0.62]]) {
      const wh = mesh(new T.CylinderGeometry(0.34, 0.34, 0.12, 14), dark, x, 0.34, z, cart);
      wh.rotation.x = Math.PI / 2;
      mesh(new T.CylinderGeometry(0.1, 0.1, 0.14, 8), gold, x, 0.34, z, cart).rotation.x = Math.PI / 2;
    }
    const drum = new T.Group();
    drum.position.set(-0.45, 1.25, 0);
    cart.add(drum);
    mesh(new T.CylinderGeometry(0.62, 0.62, 1.0, 20), red, 0, 0, 0, drum);
    for (const y of [-0.46, 0.46]) mesh(new T.TorusGeometry(0.62, 0.05, 6, 24), gold, 0, y, 0, drum).rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mesh(new T.SphereGeometry(0.04, 6, 4), gold, Math.cos(a) * 0.63, 0.4, Math.sin(a) * 0.63, drum);
      mesh(new T.SphereGeometry(0.04, 6, 4), gold, Math.cos(a) * 0.63, -0.4, Math.sin(a) * 0.63, drum);
    }
    drumSkin = mesh(new T.CylinderGeometry(0.58, 0.58, 0.04, 20), std('#f3dfb4', { roughness: 0.9 }), 0, 0.51, 0, drum);
    // the gong on its frame
    const frame = std('#5a2a18');
    mesh(new T.BoxGeometry(0.08, 1.6, 0.08), frame, 0.55, 1.4, 0.45, cart);
    mesh(new T.BoxGeometry(0.08, 1.6, 0.08), frame, 1.25, 1.4, 0.45, cart);
    mesh(new T.BoxGeometry(0.8, 0.08, 0.08), frame, 0.9, 2.18, 0.45, cart);
    gongDisc = new T.Group();
    gongDisc.position.set(0.9, 2.12, 0.45);
    cart.add(gongDisc);
    const bronze = std('#d89a3a', { metalness: 0.6, roughness: 0.3 });
    const disc = mesh(new T.CylinderGeometry(0.32, 0.32, 0.05, 24), bronze, 0, -0.42, 0, gongDisc);
    disc.rotation.x = Math.PI / 2;
    mesh(new T.SphereGeometry(0.09, 10, 8), bronze, 0, -0.42, 0.04, gongDisc);
    mesh(new T.TorusGeometry(0.32, 0.025, 6, 24), std('#a86a20', { metalness: 0.6 }), 0, -0.42, 0, gongDisc);
    mesh(new T.BoxGeometry(0.02, 0.12, 0.02), dark, 0, -0.06, 0, gongDisc);
    // the cymbals, one each side of the gong frame
    for (const sx of [-1, 1]) {
      const cy = new T.Group();
      cy.position.set(0.9 + sx * 0.62, 1.2, 0.62);
      cart.add(cy);
      const d = mesh(new T.CylinderGeometry(0.24, 0.24, 0.03, 18), gold, 0, 0, 0, cy);
      d.rotation.z = Math.PI / 2;
      mesh(new T.SphereGeometry(0.07, 8, 6), gold, sx * -0.03, 0, 0, cy);
      cymbals.push(cy);
    }
    ST.scene.add(cart);
    ST.cart = cart;
    ST.drumTop = new T.Vector3(); // where a drummer stands (world), updated each frame
  }

  // A new song: the poles, the green.
  function setSong(song) {
    if (poleGroup) ST.scene.remove(poleGroup);
    poleGroup = new T.Group();
    const wood = std('#9c4a32', { roughness: 0.75 }), top = std('#d9442f', { roughness: 0.6 }), gold = std('#ffc93c', { metalness: 0.35, roughness: 0.45 });
    const flower = new T.ExtrudeGeometry(blossomShape(1.45), { depth: 0.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 2 });
    flower.rotateX(-Math.PI / 2);
    const rim = new T.ExtrudeGeometry(blossomShape(1.53), { depth: 0.08, bevelEnabled: false });
    rim.rotateX(-Math.PI / 2);
    for (const p of song.route.poles) {
      const g = new T.Group();
      g.position.set(p.x, 0, 0);
      mesh(new T.CylinderGeometry(0.2, 0.26, p.h, 10), wood, 0, p.h / 2, 0, g);
      mesh(new T.CylinderGeometry(0.5, 0.6, 0.25, 10), wood, 0, 0.12, 0, g);
      mesh(flower, top, 0, p.h - 0.24, 0, g);
      mesh(rim, gold, 0, p.h - 0.3, 0, g);
      // painted rings up the pole
      for (let y = 0.6; y < p.h - 0.4; y += 0.7) mesh(new T.TorusGeometry(0.22, 0.03, 5, 12), gold, 0, y, 0, g, false).rotation.x = Math.PI / 2;
      poleGroup.add(g);
    }
    // the green: a tall bamboo stand with an arm, a red string, a lettuce and a red envelope
    green = new T.Group();
    const gx = song.route.green.x, gy = song.route.green.y;
    const bamboo = std('#7fb24a', { roughness: 0.6 });
    const standX = gx + 1.9;
    mesh(new T.CylinderGeometry(0.1, 0.12, gy + 1.2, 8), bamboo, standX, (gy + 1.2) / 2, -0.4, poleGroup);
    for (let y = 1; y < gy + 1; y += 0.8) mesh(new T.CylinderGeometry(0.12, 0.12, 0.05, 8), std('#5b8a30'), standX, y, -0.4, poleGroup, false);
    const arm = mesh(new T.CylinderGeometry(0.06, 0.06, 2.2, 6), bamboo, gx + 0.85, gy + 1.15, -0.2, poleGroup);
    arm.rotation.z = Math.PI / 2;
    const bundle = new T.Group();
    bundle.position.set(gx, gy, 0);
    poleGroup.add(bundle);
    mesh(new T.BoxGeometry(0.03, 1.1, 0.03), std('#d4202a'), 0, 0.6, 0, bundle, false);
    const leafM = [std('#5fd35a', { roughness: 0.7 }), std('#8ee870', { roughness: 0.7 }), std('#3fae48', { roughness: 0.7 })];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.1;
      const leaf = mesh(new T.SphereGeometry(0.22, 8, 6), leafM[i % 3], Math.cos(a) * 0.16, -0.05 + (i % 3) * 0.1, Math.sin(a) * 0.16, bundle, false);
      leaf.scale.set(1, 0.7, 1);
    }
    const env = mesh(new T.BoxGeometry(0.32, 0.44, 0.05), std('#e11d2a', { emissive: '#ff2020', emissiveIntensity: 0.25 }), 0, -0.42, 0.18, bundle, false);
    mesh(new T.BoxGeometry(0.16, 0.16, 0.02), gold, 0, -0.38, 0.215, bundle, false);
    env.rotation.z = 0.1;
    green = bundle;
    green.userData.home = bundle.position.clone();
    ST.scene.add(poleGroup);
    ST.green = green;
  }

  // Which part of the screen the scene gets (the rest is lanes), in CSS pixels.
  function resize(w, h, f) {
    W = w; H = h; free = f || { x: 0, y: 0, w, h };
    ST.renderer.setSize(w, h, false);
    ST.camera.aspect = w / h;
    ST.camera.updateProjectionMatrix();
  }

  // The world height and width that must fit in the free part of the screen.
  function frame(targetH, targetW) {
    const tan = Math.tan((ST.camera.fov * Math.PI) / 360);
    const dH = (targetH * H) / (Math.max(80, free.h) * 2 * tan);
    const dW = (targetW * H) / (Math.max(80, free.w) * 2 * tan);
    return Math.max(dH, dW);
  }

  // Each frame: follow the lion, sway the lanterns, ring the instruments, move the particles.
  function update(dt, time, lion, o = {}) {
    const look = o.look || { h: 8.2, w: 10.5 };
    const tx = lion.x + (o.ahead == null ? 1.2 : o.ahead);
    const ty = 2.4 + lion.surface * 0.62 + (o.lift || 0);
    const td = frame(look.h, look.w);
    const k = o.snap ? 1 : 1 - Math.exp(-dt * 3);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    cam.d += (td - cam.d) * k;
    const c = ST.camera;
    c.position.set(cam.x - 0.8, cam.y + cam.d * 0.12, cam.d);
    c.lookAt(cam.x, cam.y, 0);
    // put the look-at point at the middle of the free part of the screen (a bit left, so the poles ahead show)
    const fx = free.x + free.w * (o.fx == null ? 0.46 : o.fx), fy = free.y + free.h * 0.52;
    c.setViewOffset(W, H, W / 2 - fx, H / 2 - fy, W, H);

    blob.position.set(lion.x, lion.surface + 0.02, 0);
    const air = Math.max(0, lion.y - lion.surface);
    blob.material.opacity = Math.max(0.2, 1 - air * 0.35);
    blob.scale.set(4.2 - air * 0.6, 2.2 - air * 0.3, 1);

    for (const l of lanterns) {
      l.rotation.z = Math.sin(time * 1.3 + l.position.x) * 0.06;
    }
    // the cart rolls along in front, left of the lion
    if (cart) {
      const want = lion.x - 2.9;
      cart.position.x += (want - cart.position.x) * (o.snap ? 1 : 1 - Math.exp(-dt * 2.5));
      cart.position.z = 2.7;
      cart.rotation.y = 0.25;
      kick.drum = Math.max(0, kick.drum - dt * 6);
      kick.gong = Math.max(0, kick.gong - dt * 1.5);
      kick.cym = Math.max(0, kick.cym - dt * 5);
      drumSkin.position.y = 0.51 - Math.sin(kick.drum * Math.PI) * 0.04;
      drumSkin.scale.y = 1 + kick.drum * 0.6;
      gongDisc.rotation.x = Math.sin(time * 9) * 0.25 * kick.gong;
      cymbals.forEach((cy, i) => { cy.position.x = 0.9 + (i ? 1 : -1) * (0.62 - kick.cym * 0.25); cy.rotation.y = (i ? 1 : -1) * kick.cym * 0.6; });
      cart.updateMatrixWorld(true);
      ST.drumTop.set(-0.45, 1.8, -0.85).applyMatrix4(cart.matrixWorld);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      p.v.y -= (p.g == null ? 6 : p.g) * dt;
      p.s.position.addScaledVector(p.v, dt);
      p.s.material.rotation += p.spin * dt;
      p.s.material.opacity = Math.min(1, (p.life - p.t) * 2);
      if (p.t >= p.life) { ST.scene.remove(p.s); parts.splice(i, 1); }
    }
  }

  // the instruments on the cart move when the music plays them
  function ring(kind) {
    if (kind === 'd') kick.drum = 1;
    else if (kind === 'g') kick.gong = 1;
    else if (kind === 'c') kick.cym = 1;
  }

  const tex = {};
  function burst(emoji, at, n, o = {}) {
    const map = tex[emoji] || (tex[emoji] = G.emojiTexture(emoji));
    for (let i = 0; i < n; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map, transparent: true, depthWrite: false }));
      s.scale.setScalar(o.size || 0.45);
      s.position.copy(at);
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 3) * (0.5 + Math.random() * 0.7);
      const v = new T.Vector3(Math.cos(a) * sp, (o.up || 3) + Math.random() * 2.5, Math.sin(a) * sp * 0.4 + 0.8);
      ST.scene.add(s);
      parts.push({ s, v, t: 0, life: (o.life || 1.6) + Math.random() * 0.5, spin: (Math.random() - 0.5) * 6, g: o.g });
    }
  }
  function sparks(at, n = 16, color = '#ffd84a') {
    const map = G.glowTexture();
    for (let i = 0; i < n; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      s.scale.setScalar(0.35 + Math.random() * 0.3);
      s.position.copy(at);
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3;
      ST.scene.add(s);
      parts.push({ s, v: new T.Vector3(Math.cos(a) * sp, Math.sin(a) * sp + 1.5, (Math.random() - 0.5) * 2), t: 0, life: 0.5 + Math.random() * 0.4, spin: 0, g: 3 });
    }
  }
  function clearParts() {
    for (const p of parts) ST.scene.remove(p.s);
    parts.length = 0;
  }

  function showGreen(on) {
    if (!green) return;
    green.visible = on;
    green.position.copy(green.userData.home);
  }

  function render() { ST.renderer.render(ST.scene, ST.camera); }

  Object.assign(ST, { init, setSong, resize, update, ring, burst, sparks, clearParts, showGreen, render, cam });
})();
