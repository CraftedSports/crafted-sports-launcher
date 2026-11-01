/* The CHA Client helmet (shell, ear loops, chinstrap, visor / fishbowl / cage) for the launcher's 3D viewer.
   A straight port of ChaHelmet.java: same boxes, same UV mapping, same tints. Geometry is in "helmet space"
   (pixels, x = player's left, y up from the bottom of the head, z = the way the face points), which is exactly the
   space of skinview3d's head group, so the meshes are simply added to head. */
(function () {
  const SHELL = 0, SOLID = 1, CLEAR = 2, MIRRORED = 3;
  const sq = v => v * v;
  const argb = (rgb, a) => ({ rgb, a });
  const BLACK = argb(0x15181c, 1), DARK = argb(0x2a2f35, 1), STRAP = argb(0x1d2024, 1), BUCKLE = argb(0x6d737a, 1),
    WHITE_C = argb(0xf3f4f5, 1), CHROME = argb(0xc9d1d8, 1), CUP = argb(0x202326, 1), CLEAR_EDGE = argb(0xb9dcef, 0.5);
  const TINTS = {
    clear: [0xa9d7f2, .38], smoke: [0x1d252e, .74], mirror: [0xffffff, .97], blue: [0x2f6bff, .55], purple: [0x8a2be2, .6],
    red: [0xe0303a, .52], orange: [0xff8a1f, .52], amber: [0xffc53a, .48], green: [0x2fbf62, .52], pink: [0xff5fb8, .52],
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = a => Math.sqrt(dot(a, a)), norm = a => { const l = len(a); return l < 1e-9 ? [0, 1, 0] : scl(a, 1 / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const anyPerp = t => norm(Math.abs(t[1]) < 0.9 ? cross(t, [0, 1, 0]) : cross(t, [1, 0, 0]));

  function helmetUV(face, x, y, z) {
    const s = 0.8, row = Math.max(8.15, Math.min(10.6, 8 + (9 - y) * s));
    let u, v;
    switch (face) {
      case 'pz': u = 8 + (x + 5) * s; v = row; break;
      case 'nz': u = 24 + (5 - x) * s; v = row; break;
      case 'nx': u = (z + 5) * s; v = row; break;
      case 'px': u = 16 + (5 - z) * s; v = row; break;
      case 'py': u = 8 + (x + 5) * s; v = (z + 5) * s; break;
      default: u = 16 + (x + 5) * s; v = 10.5;
    }
    return [u / 64, v / 32];
  }
  const NAMES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'], NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  function faces(x0, y0, z0, x1, y1, z1) {
    return [[[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
      [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
      [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]];
  }
  // quad: {p:[4 x [x,y,z]], uv:[4 x [u,v]], n, col:{rgb,a}|null, kind}
  function shellBox(out, x0, y0, z0, x1, y1, z1) {
    faces(x0, y0, z0, x1, y1, z1).forEach((f, k) => out.push({ p: f, uv: f.map(p => helmetUV(NAMES[k], p[0], p[1], p[2])), n: NORMALS[k], col: null, kind: SHELL }));
  }
  function box(out, x0, y0, z0, x1, y1, z1, col) {
    faces(x0, y0, z0, x1, y1, z1).forEach((f, k) => out.push({ p: f, uv: f.map(() => [.5, .5]), n: NORMALS[k], col, kind: SOLID }));
  }
  function tube(out, pts, r, col, kind, u, v) {
    const n = pts.length; if (n < 2) return;
    const ring = []; let prev = null;
    for (let i = 0; i < n; i++) {
      const t = norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
      let side = prev === null ? anyPerp(t) : norm(sub(prev, scl(t, dot(prev, t))));
      if (len(side) < 1e-6) side = anyPerp(t);
      const up = norm(cross(t, side)); prev = side;
      ring.push([0, 1, 2, 3].map(k => { const a = k * Math.PI / 2 + Math.PI / 4; return add(pts[i], add(scl(side, Math.cos(a) * r), scl(up, Math.sin(a) * r))); }));
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4, a = ring[i][k], b = ring[i + 1][k], c = ring[i + 1][k2], d = ring[i][k2];
      const mid = scl(add(add(a, b), add(c, d)), .25), axis = scl(add(pts[i], pts[i + 1]), .5);
      out.push({ p: [a, b, c, d], uv: [[u, v], [u, v], [u, v], [u, v]], n: norm(sub(mid, axis)), col, kind });
    }
  }
  function shieldX(t, halfW, zFront, wrapZ, bow) {
    const flat = .78, a = Math.abs(t), sg = t < 0 ? -1 : 1;
    if (a <= flat) { const x = t / flat * 4.25; return [x, zFront - bow * sq(x / 4.25)]; }
    const ang = (a - flat) / (1 - flat) * Math.PI / 2, r = zFront - bow - wrapZ;
    return [sg * (4.25 + Math.sin(ang) * (halfW - 4.25)), wrapZ + Math.cos(ang) * r];
  }
  function shield(out, yTop, yBot, zFront, halfW, wrapZ, bow, col, kind) {
    const n = 24, top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n * 2 - 1, drop = Math.max(0, Math.abs(t) - .78) / .22, xz = shieldX(t, halfW, zFront, wrapZ, bow);
      top.push([xz[0], yTop, xz[1]]); bot.push([xz[0], yBot + drop * .9, xz[1]]);
    }
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      out.push({ p: [bot[i], bot[i + 1], top[i + 1], top[i]], uv: [[u0, 1], [u1, 1], [u1, 0], [u0, 0]], n: [0, 0, 1], col, kind });
    }
  }
  function edge(out, y, zFront, halfW, wrapZ, col) {
    const p = []; for (let i = 0; i <= 24; i++) { const xz = shieldX(i / 24 * 2 - 1, halfW, zFront, wrapZ, .85); p.push([xz[0], y, xz[1]]); }
    tube(out, p, .12 * .62, col, SOLID, 0, 0);
  }
  const path = (at, y, t0, t1, n) => Array.from({ length: n + 1 }, (_, i) => at(t0 + (t1 - t0) * i / n, y));
  const down = (at, t, y0, y1) => Array.from({ length: 9 }, (_, i) => at(t, y0 + (y1 - y0) * i / 8));

  function shellQuads(loops) {
    const out = [];
    shellBox(out, -4.7, 4.6, -4.9, 4.7, 9.0, 4.6);
    shellBox(out, -4.1, 9.0, -4.3, 4.1, 9.5, 4.0);
    shellBox(out, -4.7, 1.8, -4.9, 4.7, 4.6, -2.4);
    for (const s of [-1, 1]) {
      shellBox(out, s < 0 ? -4.7 : 4.1, 2.4, -2.4, s < 0 ? -4.1 : 4.7, 4.6, -0.9);
      shellBox(out, s < 0 ? -4.7 : 4.1, 2.6, 0.7, s < 0 ? -4.1 : 4.7, 4.6, 2.8);
    }
    if (loops) for (const s of [-1, 1]) {
      const x = s * 4.6;
      tube(out, [[x, 2.7, 2.0], [x, 1.6, 2.1], [x, 0.7, 1.7], [x, 0.25, 0.9], [x, 0.3, -0.1], [x, 0.9, -0.9], [x, 1.9, -1.3], [x, 2.5, -1.4]], .3 * .62, null, SHELL, 12 / 64, 4 / 32);
    }
    return out;
  }
  function gearQuads(gear, straps) {
    const out = [], g = gear || 'none';
    const cage = g.startsWith('cage'), bowl = g.startsWith('fishbowl'), visor = g.startsWith('visor');
    const tint = g.includes('_') ? g.slice(g.indexOf('_') + 1) : 'clear';
    if (straps) {
      for (const s of [-1, 1]) {
        for (const c of [[s * 4.78, 3.1, 1.8], [s * 4.78, 3.1, 1.25], [s * 4.78, 2.9, -1.6]]) box(out, c[0] - .12, c[1] - .15, c[2] - .15, c[0] + .12, c[1] + .15, c[2] + .15, BUCKLE);
        tube(out, [[s * 4.55, .7, 1.7], [s * 4.0, -.5, 2.3], [s * 2.6, -1.0, 2.9], [0, -1.15, 3.15]], .2 * .62, STRAP, SOLID, 0, 0);
      }
      box(out, -4.35, -.55, 2.0, -3.75, -.05, 2.5, BUCKLE);
      if (cage) box(out, -1.9, -1.75, 3.7, 1.9, -.3, 5.2, CUP);
    }
    const tcol = (t) => argb(t[0], t[1]);
    if (visor) {
      const t = TINTS[tint] || TINTS.clear, mir = tint === 'mirror';
      shield(out, 4.6, 2.2, 5.45, 4.75, 2.9, .85, mir ? null : tcol(t), mir ? MIRRORED : CLEAR);
      edge(out, 4.6, 5.45, 4.75, 2.9, BLACK);
      for (const s of [-1, 1]) box(out, s * 4.82 - .15, 4.05, 2.95, s * 4.82 + .15, 4.45, 3.35, DARK);
    }
    if (bowl) {
      const t = tint === 'clear' ? [0xe2f2fb, .26] : (TINTS[tint] || [0xe2f2fb, .26]), mir = tint === 'mirror';
      shield(out, 4.6, 1.2, 5.75, 4.85, 1.4, .85, mir ? null : tcol(t), mir ? MIRRORED : CLEAR);
      const at = (tt, y) => { const xz = shieldX(tt, 4.95, 5.85, 1.4, .85); return [xz[0], y, xz[1]]; };
      for (const y of [4.6, 1.2]) tube(out, path(at, y, -1, 1, 24), .3 * .62, CLEAR_EDGE, CLEAR, 0, 0);
      for (const y of [.35, -.5]) tube(out, path(at, y, -.95, .95, 24), .3 * .62, CLEAR_EDGE, CLEAR, 0, 0);
      tube(out, path(at, -1.35, -.8, .8, 24), .3 * .62, CLEAR_EDGE, CLEAR, 0, 0);
      for (const tt of [-.8, -.45, -.15, .15, .45, .8]) tube(out, [at(tt, 1.2), at(tt, .4), at(tt, -.5), at(tt, -1.35)], .28 * .62, CLEAR_EDGE, CLEAR, 0, 0);
      for (const sg of [-1, 1]) tube(out, [at(sg, 4.6), at(sg, 2.6), at(sg, .35)], .32 * .62, CLEAR_EDGE, CLEAR, 0, 0);
      box(out, -1.6, -1.8, 3.4, 1.6, -.6, 4.8, CUP);
    }
    if (cage) {
      const cm = g === 'cage_white' ? WHITE_C : g === 'cage_chrome' ? CHROME : BLACK, hw = 4.95, wz = 2.3, r = .2 * .62;
      const at = (tt, y) => {
        const zf = y >= 1.2 ? 5.75 - 1.0 * sq(Math.min(1, (y - 1.2) / (4.65 - 1.2))) : 5.75 - .75 * sq(Math.min(1, (1.2 - y) / 2.8));
        const w = y >= .9 ? 1 : 1 - .32 * Math.pow(Math.min(1, (.9 - y) / 2.5), 1.6);
        const xz = shieldX(tt, hw, zf, wz, 1.0);
        return [xz[0] * w, y, xz[1] + (1 - w) * 1.2 * Math.abs(tt)];
      };
      tube(out, path(at, 4.65, -.86, .86, 28), r, cm, SOLID, 0, 0);
      for (const y of [3.2, 2.0, .8, -.4]) tube(out, path(at, y, -1, 1, 28), r, cm, SOLID, 0, 0);
      tube(out, path(at, -1.6, -.86, .86, 28), r, cm, SOLID, 0, 0);
      for (const sg of [-1, 1]) {
        tube(out, down(at, sg, 4.45, -.4), r, cm, SOLID, 0, 0);
        tube(out, [at(sg, -.4), at(sg * .86, -1.6)], r, cm, SOLID, 0, 0);
        tube(out, down(at, sg * .86, 4.65, -1.6), r, cm, SOLID, 0, 0);
        const c = at(sg, 4.2); box(out, c[0] - .18, c[1] - .22, c[2] - .22, c[0] + .18, c[1] + .22, c[2] + .22, DARK);
        const f = at(sg * .5, 4.65); box(out, f[0] - .25, f[1] - .15, f[2] - .3, f[0] + .25, f[1] + .15, f[2] + .02, DARK);
      }
      for (const tt of [-.64, -.32, 0, .32, .64]) tube(out, down(at, tt, -1.6, 4.65), r, cm, SOLID, 0, 0);
    }
    return out;
  }

  /** Builds the helmet as a three.js Group using the constructors skinview3d's own objects carry (its bundle doesn't export THREE). */
  async function build(viewer, jerseySrc, gear, opts = {}) {
    const head = viewer.playerObject.skin.head, proto = head.innerLayer;
    const Mesh = proto.constructor, Mat = proto.material.constructor, Geo = proto.geometry.constructor;
    const BufGeo = Object.getPrototypeOf(Geo), Attr = proto.geometry.attributes.position.constructor, Tex = viewer.skinTexture.constructor;
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const tex = img => { const t = new Tex(img); t.magFilter = viewer.skinTexture.magFilter; t.minFilter = viewer.skinTexture.minFilter; t.colorSpace = viewer.skinTexture.colorSpace; t.needsUpdate = true; return t; };
    const geo = (quads, flipV) => {
      const pos = [], uv = [], nrm = [];
      for (const q of quads) for (const i of [0, 1, 2, 0, 2, 3]) {
        pos.push(...q.p[i]); nrm.push(...q.n); uv.push(q.uv[i][0], flipV ? 1 - q.uv[i][1] : q.uv[i][1]);
      }
      const g = new BufGeo();
      g.setAttribute('position', new Attr(pos, 3)); g.setAttribute('normal', new Attr(nrm, 3)); g.setAttribute('uv', new Attr(uv, 2));
      return g;
    };
    const root = new (Object.getPrototypeOf(Mesh))();   // a plain Object3D container
    root.name = 'chaHelmet';
    const shell = shellQuads(opts.loops !== false);
    // the shell, drawn with the jersey's own armour texture (loops sample one solid spot of it)
    if (jerseySrc) {
      const m = new Mat({ map: tex(await load(jerseySrc)), side: 2, transparent: true, alphaTest: .05 });
      root.add(new Mesh(geo(shell, true), m));
    }
    const parts = gearQuads(gear, opts.straps !== false), groups = new Map();
    for (const q of parts) { const k = q.kind + ':' + (q.col ? q.col.rgb + ':' + q.col.a : 'mir'); (groups.get(k) || groups.set(k, []).get(k)).push(q); }
    let mirror = null;
    for (const [k, qs] of groups) {
      const q0 = qs[0], g = geo(qs, true);
      let m;
      if (q0.kind === MIRRORED) {
        mirror = mirror || tex(await load(opts.mirrorSrc));
        m = new Mat({ map: mirror, side: 2, transparent: true, opacity: .97 });
      } else m = new Mat({ color: q0.col.rgb, side: 2, transparent: q0.col.a < 1, opacity: q0.col.a, depthWrite: q0.col.a >= 1 });
      const mesh = new Mesh(g, m); if (q0.kind !== SOLID) mesh.renderOrder = 2;
      root.add(mesh);
    }
    return root;
  }
  /** A held stick: the item's picture on a plane in the player's right hand (sideways, as a held item sits). */
  async function stick(viewer, src) {
    const skin = viewer.playerObject.skin, proto = skin.head.innerLayer;
    const Mesh = proto.constructor, Mat = proto.material.constructor, BufGeo = Object.getPrototypeOf(proto.geometry.constructor);
    const Attr = proto.geometry.attributes.position.constructor, Tex = viewer.skinTexture.constructor;
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const t = new Tex(img); t.magFilter = viewer.skinTexture.magFilter; t.minFilter = viewer.skinTexture.minFilter; t.colorSpace = viewer.skinTexture.colorSpace; t.needsUpdate = true;
    const g = new BufGeo(), s = 10;   // half-size: the sprite is drawn about 26 px tall, like a held item
    const P = [[-s, -s, 0], [s, -s, 0], [s, s, 0], [-s, s, 0]], U = [[0, 0], [1, 0], [1, 1], [0, 1]], pos = [], uv = [], nrm = [];
    for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...P[i]); uv.push(...U[i]); nrm.push(0, 0, 1); }
    g.setAttribute('position', new Attr(pos, 3)); g.setAttribute('normal', new Attr(nrm, 3)); g.setAttribute('uv', new Attr(uv, 2));
    const m = new Mesh(g, new Mat({ map: t, side: 2, transparent: true, alphaTest: .05 }));
    m.name = 'chaStick'; m.rotation.y = 1.1; m.rotation.z = Math.PI * 0.75; m.position.set(0, -10, 7);
    return m;
  }
  window.ChaHelmet = { build, stick };
})();
