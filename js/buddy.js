/* TT Lion Dance: calling your brother (Kit.roster.buddyFor: Tommy for Teddy, Teddy for Tommy). T, Enter or his face
   button, any time in a song, as often as you like.
   1 player: he hops in at his buddyScale, says hello with his signature move (Teddy: boxing, Tommy: the Y with ✌️),
   tosses the lion a treat (🍦 💧 🧃 🍪 🍉 🍌), then climbs onto the band's cart and plays the big drum: for 8 seconds
   the timing windows are twice as wide. Then a goodbye move (Teddy: jump shot 🏀) and he hops off. Calling again
   while he's there says hello again, brings another treat and starts the 8 seconds again.
   2 players: both brothers are already in the lion, so T or Enter is a high five: the head turns back, the tail
   jumps up, ✋. */
(function () {
  'use strict';
  const T = THREE;
  const LD = (window.LD = window.LD || {});
  const { pick, emojiTexture } = Kit.gfx;

  const VISIT = 8; // seconds on the big drum
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];

  let api = null, v = null;
  const cache = {};
  const treats = [];
  const tmpA = new T.Vector3(), tmpB = new T.Vector3();

  function init(a) { api = a; }

  // A new song: who comes when called (1 player), or nobody (2 players: high fives).
  function setup(playerId, solo) {
    clear();
    if (!solo) { v = { solo: false, calls: 0 }; return; }
    const id = Kit.roster.buddyFor(playerId);
    const entry = Kit.roster.get(id);
    let p = cache[id];
    if (!p) {
      p = cache[id] = Kit.people.build(entry.look);
      p.entry = entry;
      p.root.scale.setScalar(entry.buddyScale || 0.8);
      const tag = Kit.gfx.nameTag(entry.name, entry.tag || '#ffb02e');
      tag.position.y = 2.75;
      p.root.add(tag);
      LD.stage.scene.add(p.root);
    }
    p.root.visible = false;
    v = { solo: true, p, id, entry, state: 'away', t: 0, left: 0, calls: 0, from: new T.Vector3(), to: new T.Vector3() };
  }

  function clear() {
    if (v && v.p) v.p.root.visible = false;
    v = null;
    for (const tr of treats) LD.stage.scene.remove(tr.sprite);
    treats.length = 0;
  }

  // the drummer's spot on the cart, behind the big drum (world)
  const drumSpot = (out) => out.copy(LD.stage.drumTop).setY(0.64);

  function call() {
    if (!v) return null;
    v.calls++;
    if (!v.solo) {
      api.highFive();
      return { state: 'five' };
    }
    const name = v.entry.name;
    if (v.state === 'away' || v.state === 'out') {
      v.state = 'in';
      v.t = 0;
      const L = api.lion();
      v.from.set(L.x - 8, 0, 1.6);
      v.to.set(L.x - 1.9, L.surface > 0.1 ? 0 : 0, 1.5);
      v.p.root.visible = true;
      v.p.root.position.copy(v.from);
      api.sfx.buddy();
    } else hello();
    api.toast(`${name} IS HERE!`, 'buddy');
    return { state: v.state, helper: v.id };
  }

  function hello() {
    v.state = 'hello';
    v.t = 0;
    v.tossed = false;
    v.p.root.rotation.y = Math.PI; // to the camera
  }

  function toss() {
    const [emoji, label] = pick(TREATS);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture(emoji), depthTest: false, depthWrite: false }));
    sprite.scale.setScalar(0.7);
    sprite.renderOrder = 20;
    LD.stage.scene.add(sprite);
    v.p.root.updateMatrixWorld(true);
    Kit.people.handWorld(v.p, 1, tmpA);
    treats.push({ sprite, from: tmpA.clone(), emoji, label, u: 0 });
  }

  function update(dt, beat) {
    if (v && v.solo && v.state !== 'away') {
      v.t += dt;
      const r = v.p.root, k = 1 - Math.exp(-dt * 16);
      if (v.state === 'in') {
        const u = Math.min(1, v.t / 0.7);
        r.position.lerpVectors(v.from, v.to, u);
        r.position.y = Math.sin(u * Math.PI) * 2;
        r.rotation.y = Math.PI / 2;
        Kit.people.pose(v.p, v.t * 8, 'jump', k);
        if (u >= 1) { hello(); api.sfx.land(); }
      } else if (v.state === 'hello') {
        Kit.people.pose(v.p, v.t * 6, Kit.roster.signature(v.entry, 'hello'), k);
        if (!v.tossed && v.t >= 1.1) { v.tossed = true; toss(); }
        if (v.t >= 1.6) { v.state = 'climb'; v.t = 0; v.from.copy(r.position); }
      } else if (v.state === 'climb') {
        const u = Math.min(1, v.t / 0.6);
        drumSpot(tmpB);
        r.position.lerpVectors(v.from, tmpB, u);
        r.position.y = tmpB.y * u + Math.sin(u * Math.PI) * 1.2;
        Kit.people.pose(v.p, v.t * 8, 'jump', k);
        if (u >= 1) {
          v.state = 'drum';
          v.t = 0;
          v.left = VISIT;
          api.drum(VISIT);
          api.toast(`${v.entry.name} SAYS: I'LL PLAY THE BIG DRUM!`, 'buddy');
        }
      } else if (v.state === 'drum') {
        drumSpot(r.position);
        r.rotation.y = Math.PI - 0.25;
        // both sticks up, then down on the drum, one hand per beat
        const ph = beat * Math.PI;
        Kit.people.pose(v.p, 0, 'stand', k);
        const hitL = Math.max(0, Math.sin(ph)), hitR = Math.max(0, -Math.sin(ph));
        v.p.armL.rotation.x = 1.15 + hitL * 1.0;
        v.p.armR.rotation.x = 1.15 + hitR * 1.0;
        v.p.armL.rotation.z = -0.2;
        v.p.armR.rotation.z = 0.2;
        v.left -= dt;
        if (v.left <= 0) { v.state = 'bye'; v.t = 0; }
      } else if (v.state === 'bye') {
        drumSpot(r.position);
        r.rotation.y = Math.PI;
        Kit.people.pose(v.p, v.t * 6, Kit.roster.signature(v.entry, 'goodbye'), k);
        if (Kit.roster.signature(v.entry, 'goodbye') === 'jumpshot') {
          r.position.y += Math.max(0, Math.sin(Math.min(1, v.t * 1.4) * Math.PI)) * 0.6;
          if (!v.ball && v.t > 0.35) { v.ball = true; r.updateMatrixWorld(true); LD.stage.burst('🏀', Kit.people.handWorld(v.p, 1, tmpA), 1, { speed: 0.5, up: 7, size: 0.5, life: 1.2, g: 9 }); }
        }
        if (v.t >= 1.1) { v.state = 'out'; v.t = 0; v.ball = false; v.from.copy(r.position); }
      } else if (v.state === 'out') {
        const u = Math.min(1, v.t / 0.6);
        r.position.x = v.from.x - u * 7;
        r.position.y = v.from.y * (1 - u) + Math.sin(u * Math.PI) * 1.8;
        r.rotation.y = -Math.PI / 2;
        Kit.people.pose(v.p, v.t * 8, 'jump', k);
        if (u >= 1) { v.state = 'away'; r.visible = false; }
      }
    }
    for (let i = treats.length - 1; i >= 0; i--) {
      const tr = treats[i];
      tr.u += dt / 0.65;
      LD.lion.mouthWorld(api.lion(), tmpB);
      const u = Math.min(1, tr.u);
      tr.sprite.position.lerpVectors(tr.from, tmpB, u);
      tr.sprite.position.y += Math.sin(u * Math.PI) * 1.4;
      tr.sprite.material.rotation = u * 6;
      if (u >= 1) {
        LD.stage.scene.remove(tr.sprite);
        treats.splice(i, 1);
        api.treat(tr.emoji, tr.label, v ? v.entry.name : '');
      }
    }
  }

  const drumming = () => !!v && v.solo && v.state === 'drum';
  const present = () => !!v && v.solo && v.state !== 'away';
  const info = () => (v ? { solo: v.solo, helper: v.id || null, state: v.state || null, calls: v.calls, left: Math.max(0, v.left || 0) } : null);

  LD.buddy = { init, setup, clear, call, update, drumming, present, info, VISIT };
})();
