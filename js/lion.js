/* TT Lion Dance: the lion. A red-and-gold southern lion (醒狮): a big head with a mirror on the forehead and a horn on
   top, big eyes that blink, a jaw that opens, white fur all round; a long cloth body with gold scales and a fur
   fringe, and a fluffy tail. Two dancers are inside, and you see their legs: the head (Teddy, or Foxy when Tommy
   plays alone) and the tail (Tommy, or Froggy when Teddy plays alone), from Kit.people.
   It sleeps until the first gong, blinks and nods on the drum, shakes and wags on the cymbals, leaps on the gong,
   wobbles on a miss, rears up for the green and chews it. At the end the dancers come out, put the head down and
   do their signature moves. Our own art, made of spheres, cones and canvas textures. */
(function () {
  'use strict';
  const T = THREE;
  const LD = (window.LD = window.LD || {});
  const G = Kit.gfx;
  const { std, mesh, makeCanvas, toTexture } = G;

  const RED = '#e2352b', GOLD = '#ffc93c', FUR = '#fff6e6';
  const NU = 24, NV = 12; // cloth grid
  const FRONT_X = 0.5, BACK_X = -0.75, FEET_MID = (FRONT_X + BACK_X) / 2;
  const tmp = new T.Vector3(), tmp2 = new T.Vector3(), mat4 = new T.Matrix4(), quat = new T.Quaternion(), one = new T.Vector3(1, 1, 1);

  function scaleTexture() {
    const [c, g] = makeCanvas(128, 64);
    g.fillStyle = '#d9302a';
    g.fillRect(0, 0, 128, 64);
    for (let row = 0; row < 3; row++) {
      for (let i = -1; i < 5; i++) {
        const x = i * 32 + (row % 2) * 16, y = row * 22 + 4;
        g.fillStyle = row % 2 ? '#ffb02e' : '#ffd24a';
        g.beginPath();
        g.arc(x + 16, y, 15, 0, Math.PI);
        g.fill();
        g.strokeStyle = '#8a1a14';
        g.lineWidth = 2;
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath();
        g.arc(x + 16, y + 3, 6, 0, Math.PI);
        g.fill();
      }
    }
    const t = toTexture(c, true);
    t.repeat.set(1, 1);
    return t;
  }

  // a white fur skirt with a gold band and soft pointed tufts along the bottom
  function fringeTexture() {
    const [c, g] = makeCanvas(64, 64);
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = '#fff6e6';
    g.fillRect(0, 0, 64, 40);
    g.fillStyle = '#ffd24a';
    g.fillRect(0, 4, 64, 6);
    for (let i = 0; i < 4; i++) {
      const x = i * 16;
      g.fillStyle = i % 2 ? '#fff0d6' : '#fff6e6';
      g.beginPath();
      g.moveTo(x, 38);
      g.quadraticCurveTo(x + 3, 54, x + 8, 62 - (i % 2) * 4);
      g.quadraticCurveTo(x + 13, 54, x + 16, 38);
      g.fill();
    }
    g.strokeStyle = 'rgba(200, 170, 130, 0.5)';
    g.lineWidth = 1.5;
    for (let x = 3; x < 64; x += 5) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x + 1, 40); g.stroke(); }
    const t = toTexture(c, true);
    t.minFilter = T.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }

  // ------------------------------------------------------------------ the head (faces +x)
  function buildHead() {
    const g = new T.Group();
    const red = std(RED, { roughness: 0.55 }), gold = std(GOLD, { metalness: 0.35, roughness: 0.4 });
    const fur = std(FUR, { roughness: 0.95 }), white = std('#ffffff', { roughness: 0.35 }), ink = std('#14121f', { roughness: 0.3 });
    const green = std('#2fbf71', { roughness: 0.7 }), pink = std('#ff6fa8', { roughness: 0.7 });
    const sph = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, parent = g) => {
      const o = mesh(new T.SphereGeometry(r, 20, 14), m, x, y, z, parent, false);
      o.scale.set(sx, sy, sz);
      return o;
    };
    sph(0.62, red, 0, 0, 0, 0.95, 0.88, 1.08); // skull
    sph(0.5, red, 0.1, 0.36, 0, 1, 0.72, 1.12); // forehead dome
    sph(0.36, gold, 0.36, 0.3, 0, 0.5, 0.55, 1.4); // gold brow band
    // the mirror (to scare off bad luck) in a gold ring
    const mirror = mesh(new T.CylinderGeometry(0.15, 0.15, 0.04, 20), std('#e8f2ff', { metalness: 0.95, roughness: 0.12, emissive: '#7aa0c8', emissiveIntensity: 0.25 }), 0.56, 0.5, 0, g, false);
    mirror.rotation.z = Math.PI / 2 - 0.5;
    const ring = mesh(new T.TorusGeometry(0.17, 0.035, 6, 20), gold, 0.555, 0.5, 0, g, false);
    ring.rotation.y = Math.PI / 2;
    ring.rotation.x = 0.5;
    // the horn, with a red pom-pom
    const horn = mesh(new T.ConeGeometry(0.09, 0.36, 10), gold, 0.18, 0.86, 0, g, false);
    horn.rotation.z = -0.45;
    sph(0.1, std('#ff3a2a'), 0.1, 0.72, 0, 1, 1, 1);
    // pom-poms on top
    [[-0.12, 0.72, 0.32, pink], [-0.12, 0.72, -0.32, pink], [-0.32, 0.6, 0, green]].forEach(([x, y, z, m]) => sph(0.1, m, x, y, z));
    // ears
    for (const sz of [-1, 1]) {
      const ear = mesh(new T.ConeGeometry(0.14, 0.34, 8), red, -0.08, 0.5, sz * 0.5, g, false);
      ear.rotation.x = sz * 0.9;
      sph(0.07, fur, -0.08, 0.66, sz * 0.62);
    }
    // eyes with lids that blink, and fur eyebrows
    const lids = [];
    for (const sz of [-1, 1]) {
      const eye = new T.Group();
      eye.position.set(0.48, 0.14, sz * 0.27);
      g.add(eye);
      sph(0.17, white, 0, 0, 0, 1, 1, 1, eye);
      sph(0.085, ink, 0.12, 0, sz * 0.02, 0.6, 1, 1, eye);
      sph(0.03, white, 0.17, 0.04, sz * 0.0, 1, 1, 1, eye);
      const lid = new T.Group();
      eye.add(lid);
      const shell = mesh(new T.SphereGeometry(0.19, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold, 0, 0, 0, lid, false);
      shell.material = std(GOLD, { metalness: 0.3, roughness: 0.45, side: T.DoubleSide });
      for (let i = -1; i <= 1; i++) sph(0.045, fur, 0.02, 0.18, i * 0.09, 1, 1, 1, lid);
      lids.push(lid);
      sph(0.12, green, 0.38, 0.36, sz * 0.3, 1.5, 0.6, 1.3);
    }
    // nose, cheeks, upper lip
    sph(0.16, gold, 0.64, -0.06, 0, 0.8, 0.7, 1.4);
    for (const sz of [-1, 1]) sph(0.05, ink, 0.74, -0.08, sz * 0.09);
    for (const sz of [-1, 1]) sph(0.2, gold, 0.42, -0.12, sz * 0.42, 0.8, 0.9, 0.8);
    mesh(new T.BoxGeometry(0.18, 0.08, 0.78), gold, 0.55, -0.24, 0, g, false);
    // the jaw opens downward from a hinge at the back
    const jaw = new T.Group();
    jaw.position.set(0.05, -0.28, 0);
    g.add(jaw);
    sph(0.48, red, 0.36, -0.08, 0, 1, 0.3, 1.0, jaw);
    mesh(new T.BoxGeometry(0.55, 0.03, 0.66), std('#7a0e16', { roughness: 0.8 }), 0.36, 0.02, 0, jaw, false);
    for (let i = -2; i <= 2; i++) mesh(new T.BoxGeometry(0.06, 0.08, 0.06), white, 0.72, 0.05, i * 0.13, jaw, false);
    for (let i = 0; i < 9; i++) sph(0.1, fur, 0.3 + Math.cos(i * 0.7) * 0.25, -0.2 - (i % 3) * 0.06, (i - 4) * 0.1, 1, 1.2, 1, jaw); // the beard
    // fur all round the face
    const ringN = 26;
    const furGeo = new T.SphereGeometry(0.1, 10, 8);
    const furRing = new T.InstancedMesh(furGeo, fur, ringN);
    for (let i = 0; i < ringN; i++) {
      const a = (i / ringN) * Math.PI * 2;
      mat4.compose(tmp.set(0.18 - Math.abs(Math.sin(a)) * 0.05, 0.18 + Math.cos(a) * 0.72, Math.sin(a) * 0.76), quat, one.clone().multiplyScalar(1 + (i % 3) * 0.15));
      furRing.setMatrixAt(i, mat4);
    }
    g.add(furRing);
    return { g, lids, jaw };
  }

  // ------------------------------------------------------------------ the dancers inside
  function dancer(id, x) {
    const entry = Kit.roster.get(id);
    const p = Kit.people.build(entry.look);
    p.root.position.set(x, 0, 0);
    p.root.rotation.y = -Math.PI / 2; // face along the street (+x)
    p.entry = entry;
    p.id = id;
    return p;
  }

  function create(o) {
    const L = {
      root: new T.Group(), body: new T.Group(), time: 0, x: 0, y: 0, surface: 0,
      fx: { bob: -9, shake: -9, wobble: -9, chomp: -9, roar: -9, hop: -9, blink: -9, five: -9 },
      sleep: 1, lift: 0, wag: 0, tailUp: 0, ripple: 0, out: 0, nextBlink: 2, sig: [null, null],
    };
    L.root.add(L.body);
    L.front = dancer(o.head, FRONT_X);
    L.back = dancer(o.tail, BACK_X);
    L.body.add(L.front.root, L.back.root);

    // the head on a neck pivot, on the front dancer's shoulders
    const h = buildHead();
    L.neck = new T.Group();
    L.neck.position.set(FRONT_X + 0.12, 1.5, 0);
    L.body.add(L.neck);
    h.g.position.set(0.5, 0.36, 0);
    h.g.scale.setScalar(1.22);
    L.neck.add(h.g);
    Object.assign(L, { head: h.g, lids: h.lids, jaw: h.jaw });

    // the cloth body: one tube, bent every frame
    const geo = new T.BufferGeometry();
    const pos = new Float32Array((NU + 1) * (NV + 1) * 3), uv = new Float32Array((NU + 1) * (NV + 1) * 2), idx = [];
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
      const k = i * (NV + 1) + j;
      uv[k * 2] = (i / NU) * 4;
      uv[k * 2 + 1] = (j / NV) * 3;
      if (i < NU && j < NV) idx.push(k, k + NV + 1, k + 1, k + 1, k + NV + 1, k + NV + 2);
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    L.cloth = new T.Mesh(geo, std('#ffffff', { map: scaleTexture(), roughness: 0.75, side: T.DoubleSide }));
    L.body.add(L.cloth);
    // the fur fringe along both bottom edges
    const fGeo = new T.BufferGeometry();
    const fPos = new Float32Array((NU + 1) * 4 * 3), fUv = new Float32Array((NU + 1) * 4 * 2), fIdx = [];
    for (let s = 0; s < 2; s++) for (let i = 0; i <= NU; i++) {
      const k = (s * (NU + 1) + i) * 2;
      fUv[k * 2] = fUv[(k + 1) * 2] = (i / NU) * 10;
      fUv[k * 2 + 1] = 1;
      fUv[(k + 1) * 2 + 1] = 0;
      if (i < NU) fIdx.push(k, k + 1, k + 2, k + 2, k + 1, k + 3);
    }
    fGeo.setAttribute('position', new T.BufferAttribute(fPos, 3));
    fGeo.setAttribute('uv', new T.BufferAttribute(fUv, 2));
    fGeo.setIndex(fIdx);
    L.fringe = new T.Mesh(fGeo, std('#ffffff', { map: fringeTexture(), transparent: true, alphaTest: 0.4, side: T.DoubleSide, roughness: 1, emissive: '#5a4a3a', emissiveIntensity: 0.3 }));
    L.body.add(L.fringe);
    // fur down the spine, and the tail
    const furM = std(FUR, { roughness: 0.95 });
    L.spine = new T.InstancedMesh(new T.SphereGeometry(0.11, 8, 6), furM, 12);
    L.body.add(L.spine);
    L.tail = new T.Group();
    [[0, 0, 0, 0.2, furM], [-0.18, 0.12, 0, 0.17, std(GOLD)], [-0.3, 0.26, 0, 0.13, furM], [-0.08, -0.12, 0.12, 0.14, furM], [-0.08, -0.12, -0.12, 0.14, std('#ff6fa8')]].forEach(([x, y, z, r, m]) => mesh(new T.SphereGeometry(r, 10, 8), m, x, y, z, L.tail, false));
    L.body.add(L.tail);

    // name tags over each half
    L.tags = [L.front, L.back].map((p) => {
      const tag = G.nameTag(p.entry.name, p.entry.tag || '#ffb02e');
      tag.scale.multiplyScalar(0.8);
      L.root.add(tag);
      return tag;
    });
    dress(L, true);
    bend(L);
    return L;
  }

  // In the costume, only the dancers' legs (and a little of their trousers) show.
  function dress(L, on) {
    L.costume = on;
    for (const p of [L.front, L.back]) {
      p.head.visible = !on;
      p.armL.visible = p.armR.visible = !on;
      if (p.tail) p.tail.visible = !on; // Foxy's tail
    }
    L.cloth.visible = L.fringe.visible = L.spine.visible = L.tail.visible = on;
  }

  // One point of the cloth: u from the head (0) to the tail (1), v round the tube from one side over the top to the other.
  function clothPoint(L, u, v, out) {
    let cy = 1.64 - 0.52 * u + L.lift * Math.pow(1 - u, 1.6) * 1.05 + L.tailUp * u * u * 0.3 - L.sleep * 0.16 * (1 - u * 0.4);
    const r = 0.64 - 0.1 * u;
    const phi = -0.35 + v * (Math.PI + 0.7);
    const x = 0.72 - 2.25 * u;
    let z = r * Math.cos(phi) * 1.12 + L.wag * u * u * 0.4;
    cy += Math.sin(L.time * 2.2 + u * 2) * 0.012 + L.ripple * Math.sin(u * 9 - L.time * 26) * 0.05 * u;
    return out.set(x, cy + r * Math.sin(phi), z);
  }

  function bend(L) {
    const pos = L.cloth.geometry.attributes.position;
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
      clothPoint(L, i / NU, j / NV, tmp);
      pos.setXYZ(i * (NV + 1) + j, tmp.x, tmp.y, tmp.z);
    }
    pos.needsUpdate = true;
    L.cloth.geometry.computeVertexNormals();
    L.cloth.geometry.computeBoundingSphere();
    const fp = L.fringe.geometry.attributes.position;
    for (let s = 0; s < 2; s++) for (let i = 0; i <= NU; i++) {
      const u = i / NU;
      clothPoint(L, u, s, tmp);
      const k = (s * (NU + 1) + i) * 2;
      const sway = Math.sin(L.time * 3 + u * 5) * 0.03 + L.ripple * 0.06 * Math.sin(L.time * 30 + u * 7);
      fp.setXYZ(k, tmp.x, tmp.y + 0.02, tmp.z);
      fp.setXYZ(k + 1, tmp.x + sway, tmp.y - 0.34, tmp.z * 1.04);
    }
    fp.needsUpdate = true;
    L.fringe.geometry.computeVertexNormals();
    L.fringe.geometry.computeBoundingSphere();
    for (let i = 0; i < 12; i++) {
      clothPoint(L, 0.06 + i * 0.075, 0.5, tmp);
      mat4.compose(tmp.setY(tmp.y + 0.04), quat, one);
      L.spine.setMatrixAt(i, mat4);
    }
    L.spine.instanceMatrix.needsUpdate = true;
    clothPoint(L, 1, 0.5, tmp);
    L.tail.position.set(tmp.x - 0.08, tmp.y - 0.25, tmp.z);
    L.tail.rotation.z = 0.4 + L.tailUp * 0.5 + Math.sin(L.time * 5) * 0.08;
    L.tail.rotation.x = L.wag * 0.6;
  }

  // a decaying wiggle since an effect started
  const since = (L, k) => L.time - L.fx[k];
  const ping = (L, k, rate = 7) => { const s = since(L, k); return s < 0 || s > 2 ? 0 : Math.exp(-s * rate); };

  // ------------------------------------------------------------------ each frame
  // s = { x, y, kind (walk / leap / stand), surface (the height under it), beat (song beats, for the steps), air,
  //       sleep (0..1), lift (0..1 rearing up for the green), dt }
  function update(L, dt, s) {
    L.time += dt;
    L.x = s.x; L.y = s.y; L.surface = s.surface;
    L.root.position.set(s.x - FEET_MID, s.y, 0);
    const k = 1 - Math.exp(-dt * 14);
    L.sleep += ((s.sleep || 0) - L.sleep) * (1 - Math.exp(-dt * 5));
    L.lift += ((s.lift || 0) - L.lift) * (1 - Math.exp(-dt * 6));

    // effects
    const bob = ping(L, 'bob', 6) * Math.sin(since(L, 'bob') * 16);
    const shake = ping(L, 'shake', 4);
    const wobble = ping(L, 'wobble', 3) * Math.sin(since(L, 'wobble') * 14);
    const five = Math.max(0, 1 - Math.abs(since(L, 'five') - 0.5) / 0.5);
    L.wag = Math.sin(L.time * 22) * shake + Math.sin(L.time * 2.5) * 0.08;
    L.tailUp = ping(L, 'hop', 5) * 1.2 + five * 0.8;
    L.ripple = shake;

    // the head: nods on the drum, shakes on the cymbals, looks up for the green, turns back for a high five
    const beatBob = s.kind === 'stand' ? Math.abs(Math.sin(s.beat * Math.PI)) * 0.04 : 0;
    const air = s.air || 0;
    L.neck.position.y = 1.5 + L.lift * 1.15 - L.sleep * 0.3 - beatBob;
    L.neck.rotation.z = -bob * 0.3 - L.sleep * 0.42 + L.lift * 0.45 + air * 0.18 + ping(L, 'roar', 3) * 0.25;
    L.neck.rotation.y = -0.62 + Math.sin(L.time * 28) * shake * 0.32 + five * 1.3;
    L.neck.rotation.x = wobble * 0.18 + Math.sin(L.time * 1.7) * 0.03;
    // eyes and mouth
    if (!L.sleep || L.sleep < 0.5) {
      L.nextBlink -= dt;
      if (L.nextBlink <= 0) { blink(L); L.nextBlink = 2 + Math.random() * 3; }
    }
    const bl = since(L, 'blink');
    const shut = Math.max(Math.min(1, L.sleep * 1.4), bl >= 0 && bl < 0.22 ? Math.sin((bl / 0.22) * Math.PI) : 0);
    for (const lid of L.lids) lid.rotation.z = 1.25 + (-1.75 - 1.25) * shut;
    const ch = since(L, 'chomp');
    const chew = ch >= 0 && ch < 0.8 ? Math.abs(Math.sin(ch * 12)) * 0.6 : 0;
    const mouth = Math.max(ping(L, 'roar', 3) * 1, chew, L.lift * 0.7, ping(L, 'bob', 8) * 0.35);
    L.jaw.rotation.z = -mouth * 0.55;

    // the dancers' legs: a step on each beat while walking, tucked in a leap, a wide stance otherwise
    const ph = s.beat * Math.PI;
    for (const [p, i] of [[L.front, 0], [L.back, 1]]) {
      const sig = L.sig[i];
      if (!L.costume && sig) { celebrateStep(L, p, sig, dt); continue; }
      const mode = s.kind === 'walk' ? 'walk' : s.kind === 'leap' ? 'jump' : 'stand';
      Kit.people.pose(p, ph + i * Math.PI, mode, k);
      if (mode === 'stand') { p.legL.rotation.z += (0.22 - p.legL.rotation.z) * k; p.legR.rotation.z += (-0.22 - p.legR.rotation.z) * k; } else { p.legL.rotation.z *= 1 - k; p.legR.rotation.z *= 1 - k; }
      if (L.costume) {
        if (i === 1) p.hips.rotation.x = -1.25 + L.lift * 0.55; // the tail dancer bends over, and straightens to lift
        p.root.position.y = i === 0 ? L.lift * 1.1 : 0;
        if (i === 0 && L.lift > 0.05) { p.legL.rotation.x = 0.5; p.legR.rotation.x = -0.2; }
      }
    }
    if (L.costume) bend(L);
    else revealStep(L, dt);

    L.tags[0].position.set(FRONT_X + 0.9, 3.2 + L.lift * 1.15, 0.4);
    L.tags[1].position.set(BACK_X - 0.3, 2.45, 0.4);
    for (const t of L.tags) t.visible = L.costume && !s.hideTags;
  }

  // ------------------------------------------------------------------ what the music and the players do to it
  function hit(L, inst, rating) {
    if (inst === 'd') { L.fx.bob = L.time; if (rating === 'PERFECT' && Math.random() < 0.3) blink(L); }
    else if (inst === 'c') { L.fx.shake = L.time; L.fx.hop = L.time; }
    else { L.fx.roar = L.time; L.fx.bob = L.time; }
  }
  function miss(L) { L.fx.wobble = L.time; }
  function blink(L) { L.fx.blink = L.time; }
  function chomp(L) { L.fx.chomp = L.time; }
  function roar(L) { L.fx.roar = L.time; }
  function highFive(L) { L.fx.five = L.time; L.fx.hop = L.time; }

  // where its mouth is, in the world (for treats and the green)
  function mouthWorld(L, out = new T.Vector3()) {
    L.root.updateMatrixWorld(true);
    return L.head.localToWorld(out.set(0.75, -0.3, 0));
  }
  function headWorld(L, out = new T.Vector3()) {
    L.root.updateMatrixWorld(true);
    return L.head.localToWorld(out.set(0.2, 0.3, 0));
  }

  // ------------------------------------------------------------------ the end: out of the costume
  // The dancers come out, the head is set down in front of them looking at you, the cloth falls behind, and each
  // does his signature move (sig = Kit.people pose modes, in turn).
  function reveal(L, sigs) {
    dress(L, false);
    L.out = 0;
    L.sig = sigs.map((list) => (list ? { list, i: 0, t: 0 } : null));
    L.headFrom = { p: L.neck.position.clone(), r: L.neck.rotation.clone() };
  }
  function revealStep(L, dt) {
    L.out = Math.min(1, L.out + dt / 0.7);
    const u = L.out * L.out * (3 - 2 * L.out);
    // the head goes down onto the pole in front, turned to the camera
    L.neck.position.set(FRONT_X + 0.12 + u * 0.55, L.headFrom.p.y + (0.15 - L.headFrom.p.y) * u + Math.sin(u * Math.PI) * 0.8, 0.85 * u);
    L.neck.rotation.set(L.headFrom.r.x * (1 - u), L.headFrom.r.y + (-1.2 - L.headFrom.r.y) * u, L.headFrom.r.z * (1 - u) - 0.1 * u);
    L.head.scale.setScalar(1.22 * (1 - u * 0.25));
    const ch = since(L, 'chomp');
    for (const lid of L.lids) lid.rotation.z = 1.25 + (-1.75 - 1.25) * (ch >= 0 && ch < 0.2 ? Math.sin((ch / 0.2) * Math.PI) : 0);
    // the dancers turn to face the camera and step apart
    for (const [p, i] of [[L.front, 0], [L.back, 1]]) {
      p.root.rotation.y = -Math.PI / 2 - (Math.PI / 2) * u;
      p.root.position.x = (i ? BACK_X - 0.05 : FRONT_X - 0.25) + (i ? -0.15 : 0.15) * u;
      p.root.position.z = -0.25 * u;
      p.hips.rotation.x *= 1 - u;
    }
  }
  function celebrateStep(L, p, sig, dt) {
    sig.t += dt;
    const mode = sig.list[sig.i % sig.list.length];
    const dur = mode === 'jumpshot' ? 1.1 : 1.6;
    let y = 0;
    if (mode === 'jumpshot') {
      const u = sig.t / dur;
      y = Math.max(0, Math.sin(Math.min(1, u * 1.4) * Math.PI)) * 0.7;
      if (!sig.ball && u > 0.35) {
        sig.ball = true;
        p.root.updateMatrixWorld(true);
        LD.stage.burst('🏀', Kit.people.handWorld(p, 1, tmp2), 1, { speed: 0.6, up: 7, size: 0.55, life: 1.3, g: 9 });
      }
    }
    Kit.people.pose(p, sig.t * 6, mode, 1 - Math.exp(-dt * 16));
    p.root.position.y = y;
    if (sig.t >= dur) { sig.t = 0; sig.i++; sig.ball = false; }
  }

  function dispose(L) {
    L.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }

  LD.lion = { create, update, hit, miss, blink, chomp, roar, highFive, mouthWorld, headWorld, reveal, dress, dispose, FEET_MID };
})();
