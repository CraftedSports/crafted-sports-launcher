/* What the CHA Client draws on the rig, in the launcher viewer: goalie pads (the pack's own pad models), glove, blocker,
 * and the stick laid on the rig's stick frame. Needs ChaRig (rig.js). */
(function () {
  const { M, R, PAD } = window.ChaRig;
  const imgs = new Map();
  const loadImg = src => imgs.get(src) || (imgs.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; })), imgs.get(src));
  let padIndex = null;
  async function padDesigns() { return window.CHA_PADS; }

  function kit(viewer) {
    const skin = viewer.playerObject.skin, proto = skin.head.innerLayer;
    const G = viewer.playerWrapper.constructor;   // a plain THREE.Group (the skin's own class would build a whole second body)
    return { skin, Group: G, Mesh: proto.constructor, Mat: proto.material.constructor, BufGeo: Object.getPrototypeOf(proto.geometry.constructor),
      Attr: proto.geometry.attributes.position.constructor, Tex: viewer.skinTexture.constructor, Mx: skin.matrix.constructor, skinTex: viewer.skinTexture };
  }
  async function texture(K, src) {
    const t = new K.Tex(await loadImg(src)); t.magFilter = K.skinTex.magFilter; t.minFilter = 1008; t.generateMipmaps = true; t.anisotropy = 8; t.colorSpace = K.skinTex.colorSpace; t.needsUpdate = true; return t;
  }
  function meshOf(K, tex, quads) {
    const g = new K.BufGeo(), pos = [], uv = [], nrm = [];
    for (const q of quads) for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...q.p[i]); uv.push(q.uv[i][0], 1 - q.uv[i][1]); nrm.push(...q.n); }
    g.setAttribute('position', new K.Attr(pos, 3)); g.setAttribute('normal', new K.Attr(nrm, 3)); g.setAttribute('uv', new K.Attr(uv, 2));
    return new K.Mesh(g, new K.Mat({ map: tex, side: 2, transparent: true, alphaTest: .05 }));
  }
  const setM = (K, obj, arr) => { obj.matrixAutoUpdate = false; obj.matrix = new K.Mx().fromArray(arr); obj.matrixWorldNeedsUpdate = true; };

  // ── pads (PadModel.java) ────────────────────────────────────────────────
  const vec = (e, k) => e[k];
  const centre = e => M.sc(M.add(e.from, e.to), .5);
  function xf(p, f, t, left) {
    const s01 = left ? (t[0] - p[0]) / (t[0] - f[0]) : (p[0] - f[0]) / (t[0] - f[0]);
    const w = (p[1] - f[1]) / (t[1] - f[1]) - .5, d = (p[2] - f[2]) / (t[2] - f[2]);
    return [(left ? 1 : -1) * w * PAD.WIDTH, PAD.BOTTOM + s01 * PAD.LEN, PAD.FRONT - d * PAD.DEPTH];
  }
  const NAMES = ['north', 'south', 'west', 'east', 'up', 'down'];
  function padQuads(els) {
    const l = els[0], r = els[1], cl = centre(l), cr = centre(r), left = [], right = [];
    els.forEach((e, i) => {
      const isLeft = i === 0 || (i !== 1 && M.len(M.sub(centre(e), cl)) <= M.len(M.sub(centre(e), cr)));
      const main = isLeft ? l : r, a = e.from, b = e.to, f = main.from, t = main.to;
      const [x0, y0, z0] = a, [x1, y1, z1] = b, F = e.faces || {};
      const corners = [[[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
        [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]],
        [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]];
      const mid = xf(M.sc(M.add(a, b), .5), f, t, isLeft);
      NAMES.forEach((nm, k) => {
        const face = F[nm]; if (!face) return;
        const q = face.uv || [0, 0, 16, 16];
        let uv = [[q[0] / 16, q[3] / 16], [q[2] / 16, q[3] / 16], [q[2] / 16, q[1] / 16], [q[0] / 16, q[1] / 16]];
        for (let n = 0; n < (face.rotation || 0) / 90; n++) uv = [uv[3], uv[0], uv[1], uv[2]];
        const p = corners[k].map(c => xf(c, f, t, isLeft));
        let n = M.norm(M.cross(M.sub(p[1], p[0]), M.sub(p[2], p[0])));
        const qc = M.sc(M.add(M.add(p[0], p[1]), M.add(p[2], p[3])), .25);
        if (M.dot(n, M.sub(qc, mid)) < 0) n = M.sc(n, -1);
        (isLeft ? left : right).push({ p, uv, n });
      });
    });
    return [left, right];
  }
  async function pads(K, root, st, id) {
    const des = (await padDesigns())[id]; if (!des) return;
    const tex = await texture(K, '../assets/chaclient/' + des.tex), [lq, rq] = padQuads(des.els);
    [lq, rq].forEach((qs, i) => {
      const f = st.padFrames[i], mesh = meshOf(K, tex, qs), B = PAD.BOTTOM;
      const m = M.mul(f.m, M.mul(M.T(0, B, 0), M.mul([f.sx, 0, 0, 0, 0, f.sy, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], M.T(0, -B, 0))));
      setM(K, mesh, m); mesh.name = 'chaPad'; root.add(mesh);
    });
  }

  // ── sprite items (glove / stick): the item's picture on a plane ─────────
  function plane(w, h, cx, cy) {   // corners in the plane's own (x right, y up)
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    return { p: [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], uv: [[0, 1], [1, 1], [1, 0], [0, 0]], n: [0, 0, 1] };
  }
  /** An item sprite made solid the way Minecraft's item/generated does it: the picture front and back, and a side
   *  wall along every edge between a filled and an empty pixel, coloured from that pixel. map(u, v) -> [x, y]. */
  function extrude(img, map, thick) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const W = img.width, H = img.height, A = g.getImageData(0, 0, W, H).data, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && A[(y * W + x) * 4 + 3] > 40;
    const t = thick / 2, quads = [], P = (u, v, z) => { const [x, y] = map(u, v); return [x, y, z]; };
    const full = [[0, 0], [1, 0], [1, 1], [0, 1]];
    quads.push({ p: full.map(([u, v]) => P(u, v, t)), uv: full, n: [0, 0, 1] }, { p: full.map(([u, v]) => P(u, v, -t)), uv: full, n: [0, 0, -1] });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      const cu = (x + .5) / W, cv = (y + .5) / H, uv = [[cu, cv], [cu, cv], [cu, cv], [cu, cv]], ctr = map(cu, cv);
      const wall = (u0, v0, u1, v1) => {
        const a = map(u0, v0), b = map(u1, v1), mid = [(a[0] + b[0]) / 2 - ctr[0], (a[1] + b[1]) / 2 - ctr[1]], l = Math.hypot(...mid) || 1;
        quads.push({ p: [[...a, -t], [...b, -t], [...b, t], [...a, t]], uv, n: [mid[0] / l, mid[1] / l, 0] });
      };
      const u0 = x / W, u1 = (x + 1) / W, v0 = y / H, v1 = (y + 1) / H;
      if (!on(x - 1, y)) wall(u0, v0, u0, v1);
      if (!on(x + 1, y)) wall(u1, v0, u1, v1);
      if (!on(x, y - 1)) wall(u0, v0, u1, v0);
      if (!on(x, y + 1)) wall(u0, v1, u1, v1);
    }
    return quads;
  }
  /** The blade's bottom edge, measured off the picture: the top outline of the blade (the picture hangs upside down
   *  on the rig, so that's the edge that sits on the ice). Direction heel -> toe and the edge points, in rig px. */
  function bladeEdge(img) {
    if (img._edge) return img._edge;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const W = img.width, H = img.height, A = g.getImageData(0, 0, W, H).data, lim = Math.ceil(H * (R.HV + .06));
    const pts = [];
    for (let x = 0; x < W; x++) for (let y = 0; y < lim; y++) if (A[(y * W + x) * 4 + 3] > 40) { pts.push([SPR * ((x + .5) / W - R.HU), SPR * (y / H - R.HV), 0]); break; }
    let dir = [R.BLADE_A, R.BLADE_B];
    if (pts.length > 2) {
      // a straight line through the flat run of the edge, from the heel out (the toe's upturned tip left out)
      const xmax = Math.max(...pts.map(p => p[0])), run = pts.filter(p => p[0] >= 0 && p[0] <= xmax * .8);
      if (run.length > 2) {
        const n = run.length, mx = run.reduce((a, p) => a + p[0], 0) / n, my = run.reduce((a, p) => a + p[1], 0) / n;
        let sxx = 0, sxy = 0; for (const p of run) { sxx += (p[0] - mx) ** 2; sxy += (p[0] - mx) * (p[1] - my); }
        const k = sxy / Math.max(1e-6, sxx), l = Math.hypot(1, k);
        dir = [1 / l, k / l];
      }
    }
    const out = [];
    for (const p of pts) out.push([p[0], p[1], -.5], [p[0], p[1], .5]);
    return (img._edge = { dir, pts: out.length ? out : BLADE });
  }
  /** Where a goalie stick's paddle meets its shaft, as a fraction down the picture (the blade is at the top). */
  function junctionOf(img) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const W = img.width, H = img.height, A = g.getImageData(0, 0, W, H).data;
    const width = y => { let a = -1, b = -1; for (let x = 0; x < W; x++) if (A[(y * W + x) * 4 + 3] > 40) { if (a < 0) a = x; b = x; } return a < 0 ? 0 : b - a + 1; };
    const paddle = width(Math.floor(H * .3));
    for (let y = Math.floor(H * .3); y < H * .9; y++) if (width(y) < paddle * .7) return y / H;
    return .55;
  }
  const CC = [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];     // Minecraft model space <-> rig space (y and z flip)
  function glove(K, st, tex, left) {
    // HeldItemFeatureRenderer + the glove model's own thirdperson display, in the arm's space
    const D = left ? { r: [69, -180, 36], t: [1.5, 1.75, 3.5], s: .7 } : { r: [69, 0, -36], t: [1.5, 1.75, 3.5], s: .7 };
    let m = M.mul(M.RX(-90), M.RY(180));
    m = M.mul(m, M.T(left ? -1 : 1, 2, -10));
    const neg = left ? -1 : 1;
    m = M.mul(m, M.T(neg * D.t[0], D.t[1], D.t[2]));
    m = M.mul(m, M.mul(M.RX(D.r[0]), M.mul(M.RY(neg * D.r[1]), M.RZ(neg * D.r[2]))));
    m = M.mul(m, [D.s, 0, 0, 0, 0, D.s, 0, 0, 0, 0, D.s, 0, 0, 0, 0, 1]);
    const mesh = meshOf(K, tex, extrude(tex.image, (u, v) => [16 * (u - .5), 16 * (.5 - v)], 1));
    setM(K, mesh, M.mul(CC, m)); mesh.name = 'chaGlove';
    return mesh;
  }

  // ── blocker (RigFeature.blocker) ────────────────────────────────────────
  function blocker(K, tex, rightArm) {
    const cx = rightArm ? -1 : 1, x0 = cx - 3, x1 = cx + 3, y0 = 3.5, y1 = 11.8, z0 = -3.4, z1 = -2, S = 312;
    const face = [0, 0, 78 / S, 59 / S], back = [78 / S, 0, 156 / S, 59 / S], edge = [0, 120 / S, 78 / S, 130 / S], end = [0, 141 / S, 18 / S, 199 / S];
    const quads = [];
    const Q = (n, uv, swap, ...p) => {
      const pts = []; for (let i = 0; i < 4; i++) pts.push([p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]);
      const t = swap ? [[uv[0], uv[3]], [uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]]] : [[uv[0], uv[3]], [uv[2], uv[3]], [uv[2], uv[1]], [uv[0], uv[1]]];
      quads.push({ p: pts, uv: t, n });
    };
    Q([0, 0, -1], face, true, x0, y1, z0, x1, y1, z0, x1, y0, z0, x0, y0, z0);
    Q([0, 0, 1], back, true, x1, y1, z1, x0, y1, z1, x0, y0, z1, x1, y0, z1);
    Q([1, 0, 0], edge, true, x1, y1, z0, x1, y1, z1, x1, y0, z1, x1, y0, z0);
    Q([-1, 0, 0], edge, true, x0, y1, z1, x0, y1, z0, x0, y0, z0, x0, y0, z1);
    Q([0, -1, 0], end, false, x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);
    Q([0, 1, 0], end, false, x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0);
    const mesh = meshOf(K, tex, quads); setM(K, mesh, CC); mesh.name = 'chaBlocker';
    return mesh;
  }

  // ── stick ───────────────────────────────────────────────────────────────
  const SPR = 16 * R.SCALE * 1.08;   // the stick picture's size in rig px
  const BLADE = (() => { const d = [R.BLADE_A, R.BLADE_B], pts = []; for (let i = 0; i <= 8; i++) for (const z of [-.6, .6]) pts.push([d[0] * i * .8, d[1] * i * .8, z]); return pts; })();
  /** The goalie's stick: blade flat on the ice in front, the shaft running up to the stick hand, which holds it at the top of the paddle. */
  function goalieFrame(st, W, side, junctionFrac, edge) {
    const BA = edge.dir[0], BB = edge.dir[1], BP = edge.pts;
    const hand = st.gripTop; if (!hand) return W;
    const J = (junctionFrac - R.HV) * SPR, want = [side, 0, .1];
    let dh = [W[12] - hand[0], 0, W[14] - hand[2]]; dh = M.len(dh) < 1e-3 ? [0, 0, 1] : M.norm(dh);
    let h0 = 1.5, heel, X, s, Z;
    for (let it = 0; it < 4; it++) {
      // the heel on a ring J from the hand, at the height that sets the blade on the ice
      const dy = Math.min(J * .98, hand[1] - h0), hd = Math.sqrt(Math.max(0, J * J - dy * dy));
      heel = [hand[0] + dh[0] * hd, hand[1] - dy, hand[2] + dh[2] * hd];
      s = M.norm(M.sub(hand, heel));
      const X0 = M.norm(M.sub([0, 1, 0], M.sc(s, s[1])));
      const N0 = M.cross(X0, s), c = -BB * s[1] / (BA * Math.max(1e-3, X0[1])), t1 = Math.acos(Math.max(-1, Math.min(1, c)));
      const Xa = M.add(M.sc(X0, Math.cos(t1)), M.sc(N0, Math.sin(t1))), Xb = M.add(M.sc(X0, Math.cos(t1)), M.sc(N0, -Math.sin(t1)));
      const ba = M.add(M.sc(Xa, BA), M.sc(s, BB)), bb = M.add(M.sc(Xb, BA), M.sc(s, BB));
      X = M.dot(ba, want) >= M.dot(bb, want) ? Xa : Xb; Z = M.cross(X, s);
      let low = 1e9; for (const q of BP) low = Math.min(low, q[0] * X[1] + q[1] * s[1] + q[2] * Z[1]);
      h0 = -low;
    }
    return M.basis(X, s, Z, heel);
  }
  const MAX_TILT = 45 * Math.PI / 180, STICK_MAX = R.stickLen() * 1.08;
  /** A skater's stick (RigFeature.held): the shaft through both hands, the blade's face upright (tipped at most 45 deg
   *  toward lying flat), the toe out to the stick side, slid down through the hands until the blade is on the ice. */
  function skaterFrame(st, W, side, edge) {
    const BA = edge.dir[0], BB = edge.dir[1], BP = edge.pts;
    let s = [W[4], W[5], W[6]], gt = st.gripTop, gb = st.gripBot;
    if (!gt) return W;
    if (st.stickDir) s = st.stickDir;
    else if (gb && M.len(M.sub(gt, gb)) > 2) s = M.norm(M.sub(gt, gb));
    if (s[1] < -.3) s = [W[4], W[5], W[6]];
    const want = [side, 0, .35];
    let X0 = M.sub([0, 1, 0], M.sc(s, s[1])); if (M.len(X0) < 1e-3) return W; X0 = M.norm(X0);
    const N0 = M.cross(X0, s), c = -BB * s[1] / (BA * Math.max(1e-3, X0[1])), t1 = Math.acos(Math.max(-1, Math.min(1, c))), tilt = t1;   // blade flat on the ice: the toe never dips into it
    const Xa = M.add(M.sc(X0, Math.cos(tilt)), M.sc(N0, Math.sin(tilt))), Xb = M.add(M.sc(X0, Math.cos(tilt)), M.sc(N0, -Math.sin(tilt)));
    const ba = M.add(M.sc(Xa, BA), M.sc(s, BB)), bb = M.add(M.sc(Xb, BA), M.sc(s, BB));
    const X = M.dot(ba, want) >= M.dot(bb, want) ? Xa : Xb, Z = M.cross(X, s);
    let low = 1e9; for (const q of BP) low = Math.min(low, q[0] * X[1] + q[1] * s[1] + q[2] * Z[1]);
    if (st.stickDir) gb = null;   // the preview's stick line runs through the top hand
    const heelY = -low, anchor = gb || gt;
    let u = (anchor[1] - heelY) / Math.max(.2, s[1]);
    const topU = u + (gb ? M.dot(M.sub(gt, gb), s) : 0), max = STICK_MAX - 1.2;
    if (topU > max) u -= topU - max;
    return M.basis(X, s, Z, M.sub(anchor, M.sc(s, Math.max(2, u))));
  }
  async function stick(K, st, src, side) {
    let W = st.W.stick.slice();
    const tex = await texture(K, src);
    const edge = bladeEdge(tex.image);
    if (st.goalie) W = goalieFrame(st, W, side, junctionOf(tex.image), edge);
    else W = skaterFrame(st, W, side, edge);
    // (both frames already stand the blade on its bottom edge - no flipping it over afterwards)
    // sprite mapping from the studio: the heel is at (HU, HV) of the picture, blade at the picture's top, so the picture hangs upside down on the rig
    const mesh = meshOf(K, tex, extrude(tex.image, (u, v) => [SPR * (u - R.HU), SPR * (v - R.HV)], SPR / 16));
    setM(K, mesh, W); mesh.name = 'chaStick';
    return mesh;
  }

  /** opts: {pads: designId|null, glove: colour|null, blocker: bool, stick: src|null, leftHanded} */
  async function build(viewer, st, opts) {
    const K = kit(viewer);
    if (viewer._gear) { viewer._gear.parent?.remove(viewer._gear); viewer._gear = null; }
    for (const arm of [K.skin.leftArm, K.skin.rightArm]) for (const c of [...arm.children]) if (c.name === 'chaGlove' || c.name === 'chaBlocker') arm.remove(c);
    if (!st) return;
    const root = new K.Group(); root.name = 'chaGear'; root.position.set(0, -24 + st.lift, 0);
    K.skin.add(root); viewer._gear = root;
    const side = opts.leftHanded ? -1 : 1;
    try { if (st.goalie && opts.pads) await pads(K, root, st, opts.pads); } catch (e) { console.warn('pads', e); }
    try { if (opts.stick) root.add(await stick(K, st, opts.stick, side)); } catch (e) { console.warn('stick', e); }
    if (st.goalie) {
      // catch-left goalie (side 1): glove on the left arm, blocker on the right
      try {
        if (opts.glove) { const arm = st.blockerLeft ? K.skin.rightArm : K.skin.leftArm; arm.add(glove(K, st, await texture(K, `../assets/chaclient/gloves/${opts.glove}.png`), !st.blockerLeft)); }
        if (opts.blocker) { const arm = st.blockerLeft ? K.skin.leftArm : K.skin.rightArm; arm.add(blocker(K, await texture(K, '../assets/chaclient/blockers/mauer.png'), !st.blockerLeft)); }
      } catch (e) { console.warn('glove/blocker', e); }
    }
  }
  window.ChaGear = { build, _edge: bladeEdge };
})();
