/* The CHA rig in the launcher: the same maths as the CHA Client (Rig.java / Clip.java / ChaAnim.pose) so the preview
 * holds the same stance. Rig space: pixels, +y up, +z the way the player faces, +x the player's left, origin on the ice. */
(function () {
  const D2R = Math.PI / 180;
  const M = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    sc: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm(a) { let l = M.len(a); if (l === 0) l = 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u],
    I: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; },
    T(x, y, z) { const m = M.I(); m[12] = x; m[13] = y; m[14] = z; return m; },
    RX(d) { const a = d * D2R, c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
    RY(d) { const a = d * D2R, c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
    RZ(d) { const a = d * D2R, c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    R: (p, y, r) => M.mul(M.RY(y), M.mul(M.RX(p), M.RZ(r))),
    basis: (x, y, z, o) => [x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, o[0], o[1], o[2], 1],
    ap: (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]],
    dir: (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]],
    rotOf(m) { const o = m.slice(); o[12] = o[13] = o[14] = 0; return o; },
    pos: m => [m[12], m[13], m[14]],
    col: (m, c) => [m[c * 4], m[c * 4 + 1], m[c * 4 + 2]],
  };
  const R = { THIGH: 6, SHIN: 4, ANKLE: 3, HIP_X: 2, ABD: 6, CHEST: 6, SH_X: 6, SH_Y: 4, UPPER: 4, FORE: 5, HU: 13.5 / 64, HV: 10 / 64, SCALE: 1.45, BLADE_A: .83, BLADE_B: -.55 };
  R.REACH = R.UPPER + R.FORE; R.stickLen = () => (1 - R.HV) * 16 * R.SCALE;
  const ARM_LEN = 10, LEG_LEN = 12, BODY_LEN = 12, GOALIE_HIP_MAX = 11.4;

  // ── poses: clips ────────────────────────────────────────────────────────
  let LIB = null;
  async function load(url) {
    if (LIB) return LIB;
    const j = window.CHA_ANIMS;
    if (j.rig?.stick) { R.HU = j.rig.stick.hu; R.HV = j.rig.stick.hv; R.SCALE = j.rig.stick.scale; }
    LIB = { base: j.base, clips: Object.fromEntries(j.clips.map(c => [c.id, prep(c, j.base[c.role])])) };
    return LIB;
  }
  function prep(c, base) {
    const keys = [...c.keys].sort((a, b) => a.t - b.t); let cur = { ...base }; const full = [];
    for (const k of keys) { cur = { ...cur, ...k }; full.push(cur); }
    if (c.loop) {
      if (full[0].t > 0) full.unshift({ ...full[full.length - 1], t: 0 });
      if (full[full.length - 1].t < c.len) full.push({ ...full[0], t: c.len });
    }
    const arr = o => typeof o === 'number' ? [o] : Array.isArray(o) ? o.slice() : [0];
    return { id: c.id, len: c.len, loop: c.loop, hold: c.hold, times: full.map(k => k.t), lin: full.map(k => !!k.lin), chans: Object.keys(base).map(ch => [ch, full.map(k => arr(k[ch]))]) };
  }
  function slope(c, v, j, ch) {
    const n = c.times.length, T = c.times;
    const prev = j > 0 ? j - 1 : (c.loop ? n - 2 : -1), next = j < n - 1 ? j + 1 : (c.loop ? 1 : -1);
    if (prev < 0 || next < 0) return 0;
    const tp = j > 0 ? T[j] - T[prev] : T[j] + (c.len - T[prev]), tn = j < n - 1 ? T[next] - T[j] : T[next] + c.len - T[j];
    const a = (v[j][ch] - v[prev][ch]) / tp, b = (v[next][ch] - v[j][ch]) / tn;
    if (a * b <= 0) return 0;
    const avg = (a * tn + b * tp) / (tp + tn);
    return avg * Math.min(1, 3 * Math.min(Math.abs(a), Math.abs(b)) / Math.max(1e-9, Math.abs(avg)));
  }
  function sample(c, t) {
    const T = c.times, n = T.length, ch = {};
    for (const [name, v] of c.chans) {
      const d = v[0].length;
      if (n === 1 || t <= T[0]) { ch[name] = v[0].slice(); continue; }
      if (t >= T[n - 1]) { ch[name] = v[n - 1].slice(); continue; }
      let i = 0; while (i < n - 2 && t > T[i + 1]) i++;
      const t0 = T[i], h = T[i + 1] - t0, u = (t - t0) / h, out = new Array(d);
      for (let k = 0; k < d; k++) {
        const p0 = v[i][k], p1 = v[i + 1][k];
        if (c.lin[i + 1]) { out[k] = p0 + (p1 - p0) * u; continue; }
        const m0 = slope(c, v, i, k) * h, m1 = slope(c, v, i + 1, k) * h, u2 = u * u, u3 = u2 * u;
        out[k] = (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
      }
      ch[name] = out;
    }
    return { ch, ox: 1 };
  }
  const g = (p, k) => p.ch[k] ? p.ch[k][0] : 0;
  const v = (p, k, ...def) => p.ch[k] || def;
  function copy(p) { const ch = {}; for (const k in p.ch) ch[k] = p.ch[k].slice(); return { ch, ox: p.ox }; }
  const PAIRS = [['fl', 'fr'], ['fpl', 'fpr'], ['kl', 'kr'], ['knl', 'knr'], ['ol', 'or'], ['tl', 'tr'], ['hl', 'hr'], ['el', 'er']];
  const XVEC = ['r', 'pv', 'h', 'sth', 'sta', 'hl', 'hr', 'el', 'er', 'kl', 'kr'];
  function mirror(p) {
    const q = copy(p), c = q.ch;
    for (const [a, b] of PAIRS) { const t = c[a]; c[a] = c[b]; c[b] = t; }
    for (const k of XVEC) if (c[k]) c[k][0] = -c[k][0];
    for (const k of ['fl', 'fr']) if (c[k]) { c[k][0] = -c[k][0]; c[k][3] = -c[k][3]; }
    for (const k of ['fpl', 'fpr']) if (c[k]) c[k][1] = -c[k][1];
    for (const k of ['knl', 'knr']) if (c[k]) { c[k][1] = -c[k][1]; c[k][3] = -c[k][3]; }
    for (const k of ['rot', 'hp', 'sp', 'hd', 'gv']) if (c[k]) { c[k][1] = -c[k][1]; c[k][2] = -c[k][2]; }
    if (c.stw) c.stw[0] = -c.stw[0];
    q.ox = -p.ox; return q;
  }
  function add(p, k, i, d) { if (p.ch[k] && p.ch[k].length > i) p.ch[k][i] += d; }

  // ── the solve ───────────────────────────────────────────────────────────
  function twoBone(a, target, l1, l2, pole) {
    const d = M.sub(target, a), dist = M.len(d), maxR = l1 + l2 - 1e-3, minR = Math.abs(l1 - l2) + 1e-3, cl = Math.min(maxR, Math.max(minR, dist));
    const dn = M.norm(d), end = M.add(a, M.sc(dn, cl)), x = (l1 * l1 - l2 * l2 + cl * cl) / (2 * cl), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    let pd = M.sub(pole, a); pd = M.sub(pd, M.sc(dn, M.dot(pd, dn)));
    if (M.len(pd) < 1e-5) pd = Math.abs(dn[1]) < .9 ? M.cross(dn, [0, 1, 0]) : [1, 0, 0];
    pd = M.norm(pd);
    return { mid: M.add(M.add(a, M.sc(dn, x)), M.sc(pd, h)), end };
  }
  function boneFrame(from, to, front) {
    const y = M.norm(M.sub(from, to)); let z = M.sub(front, M.sc(y, M.dot(front, y)));
    if (M.len(z) < 1e-5) z = Math.abs(y[1]) < .9 ? M.cross([0, 1, 0], y) : [0, 0, 1];
    z = M.norm(z); return M.basis(M.cross(y, z), y, z, from);
  }
  function probe(W, name, minY, pts) { const m = W[name]; if (!m) return minY; for (const q of pts) minY = Math.min(minY, M.ap(m, q)[1]); return minY; }
  const bladeAt = (X0, N0, s, t) => M.add(M.sc(M.add(M.sc(X0, Math.cos(t)), M.sc(N0, Math.sin(t))), R.BLADE_A), M.sc(s, R.BLADE_B));

  function solve(p, goalie) {
    const S = { W: {}, goalie }, W = S.W;
    const r = v(p, 'r', 0, 0, 0), rot = v(p, 'rot', 0, 0, 0), pv = v(p, 'pv', 0, 0, 0);
    const root = M.mul(M.T(r[0] + pv[0], r[1] + pv[1], r[2] + pv[2]), M.mul(M.R(rot[0], rot[1], rot[2]), M.T(-pv[0], -pv[1], -pv[2])));
    const h = v(p, 'h', 0, 11, -.6), hp = v(p, 'hp', 0, 0, 0), sp = v(p, 'sp', 0, 0, 0), hd = v(p, 'hd', 0, 0, 0);
    const hips = M.mul(root, M.mul(M.T(h[0], h[1], h[2]), M.R(hp[0], hp[1], hp[2])));
    W.abd = M.mul(hips, M.R(sp[0] * .45, sp[1] * .45, sp[2] * .45));
    W.chest = M.mul(W.abd, M.mul(M.T(0, R.ABD, 0), M.R(sp[0] * .55, sp[1] * .55, sp[2] * .55)));
    W.head = M.mul(W.chest, M.mul(M.T(0, R.CHEST, 0), M.R(hd[0], hd[1], hd[2])));
    for (const s of ['l', 'r']) {
      const side = s === 'l' ? 1 : -1, f = v(p, 'f' + s, side * 3.6, 3, .5, 0), hip = M.ap(hips, [side * R.HIP_X, 0, 0]);
      const yaw = f.length > 3 ? f[3] : 0, fwd = M.dir(root, [Math.sin(yaw * D2R), 0, Math.cos(yaw * D2R)]);
      let ankle = M.ap(root, [f[0], f[1], f[2]]);
      const ko = v(p, 'k' + s, 0, 0, 0);
      let pole = M.add(M.lerp(hip, ankle, .5), M.add(M.add(M.sc(fwd, 12), M.dir(root, [side * 1.5, 2, 0])), M.dir(root, ko)));
      const kn = p.ch['kn' + s]; let kf = null, kw = 0;
      if (kn && kn[0] > 0) {
        kw = kn[0];
        const kd = M.norm(M.dir(root, [kn[1], 0, kn[2]])), sd = M.norm(M.dir(root, [kn[3], 0, kn[4]]));
        const ky = Math.min(hip[1] - .3, 2.0), dy = hip[1] - ky, horiz = Math.sqrt(Math.max(.01, R.THIGH * R.THIGH - dy * dy));
        const knee = [hip[0] + kd[0] * horiz, ky, hip[2] + kd[2] * horiz];
        const ak = M.add(knee, M.add(M.sc(sd, R.SHIN * .97), [0, .6, 0]));
        ankle = M.lerp(ankle, ak, kw);
        pole = M.lerp(pole, M.add(knee, M.sub(knee, M.lerp(hip, ak, .5))), kw);
        const flare = kn.length > 5 ? kn[5] : 0, f0 = M.dir(root, [0, 0, 1]), fwdPerp = M.norm(M.sub(f0, M.sc(sd, M.dot(f0, sd))));
        kf = M.norm(M.lerp(M.add(M.dir(root, [0, -1, 0]), M.sc(sd, -.3)), M.add(fwdPerp, [0, .25, 0]), flare));
      }
      const ik = twoBone(hip, ankle, R.THIGH, R.SHIN, pole);
      let kneeFront = M.sub(pole, ik.mid);
      if (kf) kneeFront = M.lerp(M.norm(kneeFront), kf, kw);
      W['th' + s] = boneFrame(hip, ik.mid, kneeFront); W['sh' + s] = boneFrame(ik.mid, ik.end, kneeFront);
      const fp = v(p, 'fp' + s, 0, 0);
      W['ft' + s] = M.mul(M.T(ik.end[0], ik.end[1], ik.end[2]), M.mul(M.rotOf(root), M.R(fp[0], yaw, fp[1])));
      if (goalie) W['pad' + s] = M.mul(W['sh' + s], M.T(0, -2.6 * kw, 0));
    }
    // stick
    let heel = M.ap(root, v(p, 'sth', 6.5, 0, 16));
    const aim = M.ap(root, v(p, 'sta', -1.5, 15, 7));
    let s = M.norm(M.sub(aim, heel));
    const Lh = R.stickLen(), reach = R.REACH - .15, hands = [];
    for (const hh of ['l', 'r']) if (g(p, 'o' + hh) > .5) hands.push(hh);
    hands.sort((a, b) => g(p, 't' + a) - g(p, 't' + b));
    if (hands.length) {
      const hh = hands[0], sh = M.ap(W.chest, [(hh === 'l' ? 1 : -1) * R.SH_X, R.SH_Y, 0]);
      const gp = M.add(heel, M.sc(s, Lh * (1 - g(p, 't' + hh)))), d = M.sub(gp, sh), dl = M.len(d);
      if (dl > reach) heel = M.add(heel, M.sc(M.norm(d), -(dl - reach) * Math.min(1, g(p, 'o' + hh))));
    }
    if (hands.length > 1) {
      const top = hands[0], bot = hands[1], tt = g(p, 't' + top), tb = g(p, 't' + bot), span = Lh * (tb - tt);
      const gt = M.add(heel, M.sc(s, Lh * (1 - tt))), sb = M.ap(W.chest, [(bot === 'l' ? 1 : -1) * R.SH_X, R.SH_Y, 0]), gb = M.add(heel, M.sc(s, Lh * (1 - tb)));
      if (span > .5 && M.len(M.sub(gb, sb)) > reach) {
        const d0 = M.norm(M.sub(gb, gt)), d1 = M.norm(M.sub(sb, gt)); let lo = 0, hi = 1;
        if (M.len(M.sub(M.add(gt, M.sc(M.norm(M.lerp(d0, d1, 1)), span)), sb)) <= reach) {
          for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (M.len(M.sub(M.add(gt, M.sc(M.norm(M.lerp(d0, d1, m)), span)), sb)) > reach) lo = m; else hi = m; }
        }
        const nd = M.norm(M.lerp(d0, d1, hi)); s = M.sc(nd, -1); heel = M.sub(gt, M.sc(s, Lh * (1 - tt)));
      }
    }
    let X0 = M.sub([0, 1, 0], M.sc(s, s[1]));
    X0 = M.len(X0) < 1e-4 ? M.dir(root, [1, 0, 0]) : M.norm(X0);
    const N0 = M.cross(X0, s), c = Math.min(1, Math.max(-1, -R.BLADE_B * s[1] / (R.BLADE_A * Math.max(1e-3, X0[1])))), t1 = Math.acos(c);
    const out = M.dir(root, goalie ? [.8 * p.ox, 0, .6] : [.75 * p.ox, 0, .66]);
    let tw = (M.dot(bladeAt(X0, N0, s, t1), out) >= M.dot(bladeAt(X0, N0, s, -t1), out) ? t1 : -t1) / D2R;
    tw += g(p, 'stw'); const tr = tw * D2R;
    const X = M.add(M.sc(X0, Math.cos(tr)), M.sc(N0, Math.sin(tr))), Z = M.cross(X, s);
    W.stick = M.basis(X, s, Z, heel);
    for (const sd of ['l', 'r']) {
      const side = sd === 'l' ? 1 : -1, sh = M.ap(W.chest, [side * R.SH_X, R.SH_Y, 0]), on = g(p, 'o' + sd);
      let tgt = p.ch['h' + sd] ? M.ap(root, p.ch['h' + sd]) : M.add(sh, [0, -9, 2]);
      if (on > 0) tgt = M.lerp(tgt, M.add(heel, M.sc(s, Lh * (1 - g(p, 't' + sd)))), on);
      const eo = v(p, 'e' + sd, 0, 0, 0), pole = M.add(sh, M.dir(root, M.add([side * 6, -6, -7], eo)));
      const ik = twoBone(sh, tgt, R.UPPER, R.FORE, pole), front = M.sub(M.lerp(sh, ik.end, .5), pole);
      W['up' + sd] = boneFrame(sh, ik.mid, front); W['fo' + sd] = boneFrame(ik.mid, ik.end, front);
      if (sd === 'l') S.handL = ik.end; else S.handR = ik.end;
    }
    // ground contact
    let minY = 1e9;
    for (const sd of ['l', 'r']) {
      minY = probe(W, 'ft' + sd, minY, [[0, -3, -2.8], [0, -3, 3.4]]);
      minY = probe(W, 'sh' + sd, minY, [[0, 0, 2], [0, 0, -2], [2, 0, 0], [-2, 0, 0], [0, -2, 2.4]]);
      minY = probe(W, 'th' + sd, minY, [[0, 0, -2], [2, -3, -2], [-2, -3, -2]]);
      minY = probe(W, 'fo' + sd, minY, [[0, -R.FORE, 0], [2, -R.FORE, 2]]);
      minY = probe(W, 'up' + sd, minY, [[2, -3, 0], [-2, -3, 0]]);
      if (goalie) minY = probe(W, 'pad' + sd, minY, [[3.2, -7.2, 3.6], [-3.2, -7.2, 3.6], [3.2, -7.2, .2], [-3.2, -7.2, .2], [3.2, 3, 3.6], [-3.2, 3, 3.6], [3.2, 0, .2], [-3.2, 0, .2]]);
    }
    minY = probe(W, 'abd', minY, [[4, -.4, 2], [-4, -.4, 2], [4, -.4, -2], [-4, -.4, -2], [4, 3, -2], [-4, 3, -2], [4, 3, 2], [-4, 3, 2]]);
    minY = probe(W, 'chest', minY, [[4, 6, -2], [-4, 6, -2], [4, 6, 2], [-4, 6, 2], [4, 3, 2], [-4, 3, 2], [4, 3, -2], [-4, 3, -2]]);
    minY = probe(W, 'head', minY, [[4, 8, 4], [-4, 8, 4], [4, 8, -4], [-4, 8, -4], [4, 4, 4], [-4, 4, -4], [-4, 4, 4], [4, 4, -4]]);
    const shift = (g(p, 'floor') - minY) * (1 - g(p, 'air')), Tm = M.T(0, shift, 0);
    if (Math.abs(shift) > 1e-6) {
      for (const k of Object.keys(W)) W[k] = M.mul(Tm, W[k]);
      S.handL = M.add(S.handL, [0, shift, 0]); S.handR = M.add(S.handR, [0, shift, 0]);
    }
    S.root = M.mul(Tm, root); S.p = p;
    return S;
  }

  // ── onto the viewer's body parts (ChaAnim.place) ────────────────────────
  /** skinview3d's frame is the rig's (x left, y up, z forward) with the ice 24 px below the neck. */
  function placePart(THREE, part, at, down, front, lift) {
    part.position.set(at[0], at[1] - 24 + lift, at[2]);
    if (M.len(down) < 1e-6) return;
    const y = M.sc(M.norm(down), -1);                           // the part's top is up along its length
    let z = M.sub(front, M.sc(y, M.dot(front, y)));
    if (M.len(z) < 1e-5) z = Math.abs(y[1]) < .9 ? M.cross([0, 1, 0], y) : [0, 0, 1];
    z = M.norm(z); const x = M.cross(y, z);
    const m = new part.matrix.constructor().set(x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, 0, 0, 0, 1);
    part.quaternion.setFromRotationMatrix(m);
  }
  const defaults = new WeakMap();
  const PARTS = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
  function remember(viewer) {
    const skin = viewer.playerObject.skin;
    if (defaults.has(skin)) return;
    defaults.set(skin, Object.fromEntries(PARTS.map(k => [k, { p: skin[k].position.clone(), q: skin[k].quaternion.clone(), s: skin[k].scale.clone() }])));
  }
  function reset(viewer) {
    const skin = viewer.playerObject.skin, d = defaults.get(skin);
    if (!d) return;
    for (const k of PARTS) { skin[k].position.copy(d[k].p); skin[k].quaternion.copy(d[k].q); skin[k].scale.copy(d[k].s); skin[k].rotation.set(0, 0, 0); skin[k].quaternion.copy(d[k].q); }
    viewer._rig = null;
  }

  /** stance: {role:'goalie'|'skater', clip, t, leftHanded, kneel} -> the solved rig, parts moved. */
  function apply(viewer, o) {
    const THREE = viewer._three, skin = viewer.playerObject.skin, goalie = o.role === 'goalie';
    remember(viewer);
    const clip = LIB.clips[o.clip || (goalie ? 'gstance' : 'ready')];
    let t = o.t == null ? 0 : o.t;
    if (clip.hold && o.t == null) t = clip.hold.at;
    let pose = sample(clip, clip.loop ? t % clip.len : Math.min(t, clip.len));
    add(pose, 'hp', 0, goalie ? -4 : -9); add(pose, 'sp', 0, goalie ? -4 : -11); add(pose, 'hd', 0, goalie ? 8 : 20);
    if (o.leftHanded) pose = mirror(pose);
    if (pose.ch.r) { pose.ch.r = pose.ch.r.slice(); pose.ch.r[0] = 0; pose.ch.r[2] = 0; }
    const s = solve(pose, goalie);
    let lift = 0;
    if (goalie && g(pose, 'air') < .5) { const hy = M.pos(s.W.abd)[1]; if (hy > GOALIE_HIP_MAX) lift -= hy - GOALIE_HIP_MAX; }
    const neck = M.pos(s.W.head), hip = M.pos(s.W.abd), cf = M.col(s.W.chest, 2);
    for (const k of PARTS) skin[k].scale.set(1, 1, 1);
    // skinview3d pivots the body at its centre (Minecraft at the neck): put the centre halfway down the torso
    skin.body.scale.y = clamp(M.len(M.sub(hip, neck)) / BODY_LEN, .45, 1.35);
    placePart(THREE, skin.body, M.add(neck, M.sc(M.norm(M.sub(hip, neck)), BODY_LEN / 2 * skin.body.scale.y)), M.sub(hip, neck), cf, lift);
    placePart(THREE, skin.head, neck, M.sc(M.col(s.W.head, 1), -1), M.col(s.W.head, 2), lift);
    const drawn = [null, null], blockerArmLeft = goalie ? !(pose.ox > 0) : false;
    for (let i = 0; i < 2; i++) {
      const left = i === 0, sh = M.ap(s.W.chest, [(left ? 1 : -1) * R.SH_X, R.SH_Y, 0]);
      let hand = left ? s.handL : s.handR;
      const blockerOut = goalie && !o.moving && left === blockerArmLeft;
      if (blockerOut) hand = M.ap(s.root, [(left ? 1 : -1) * 7.5, 6.5, 9.5]);   // blocker hand low and out front, at the top of the paddle
      const arm = left ? skin.leftArm : skin.rightArm;
      placePart(THREE, arm, sh, M.sub(hand, sh), cf, lift);
      arm.scale.y = clamp(M.len(M.sub(hand, sh)) / ARM_LEN, .9, blockerOut ? 1.25 : 1.08);   // the blocker board hides the blocker forearm's stretch
      drawn[i] = M.add(sh, M.sc(M.norm(M.sub(hand, sh)), ARM_LEN * arm.scale.y - .8));
    }
    // preview only: a skater's stick runs from its heel on the ice (where the pose puts it) up through the top hand, and
    // the bottom hand takes hold of it wherever its arm reaches (the studio's two-handed reach lifts the stick off the ice)
    if (!goalie && o.fitStick && g(pose, 'ol') > .5 && g(pose, 'or') > .5) {
      const topL = g(pose, 'tl') <= g(pose, 'tr'), ti = topL ? 0 : 1, bi = 1 - ti, gt = drawn[ti];
      let H = M.ap(s.root, v(pose, 'sth', 6.5, 0, 16)); H[1] = 0;
      // out along the same line on the ice until the stick's full length fits between the heel and the top hand
      const gg = [gt[0], 0, gt[2]], dh = M.norm(M.sub(H, gg)), need = R.stickLen() * .92;
      if (need > gt[1]) H = M.add(gg, M.sc(dh, Math.sqrt(need * need - gt[1] * gt[1])));
      const L = M.len(M.sub(gt, H)), dirS = M.norm(M.sub(gt, H)), bl = bi === 0;
      const shB = M.ap(s.W.chest, [(bl ? 1 : -1) * R.SH_X, R.SH_Y, 0]);
      const k = clamp(M.dot(M.sub(shB, H), dirS), 3, L - 3), target = M.add(H, M.sc(dirS, Math.min(k, L - 3)));
      const arm = bl ? skin.leftArm : skin.rightArm;
      placePart(THREE, arm, shB, M.sub(target, shB), cf, lift);
      arm.scale.y = clamp(M.len(M.sub(target, shB)) / ARM_LEN, .9, 1.08);
      drawn[bi] = M.add(shB, M.sc(M.norm(M.sub(target, shB)), ARM_LEN * arm.scale.y - .8));
      s.stickDir = dirS;
    }
    for (let i = 0; i < 2; i++) {
      const left = i === 0, th = s.W[left ? 'thl' : 'thr'], ft = s.W[left ? 'ftl' : 'ftr'], hipJ = M.pos(th);
      let sole = M.ap(ft, [0, -R.ANKLE, 0]);
      if (goalie) { const kn = pose.ch[left ? 'knl' : 'knr'], kw = kn ? clamp(kn[0], 0, 1) : 0; if (kw > 0) sole = M.lerp(sole, M.pos(s.W[left ? 'shl' : 'shr']), kw); }
      const leg = left ? skin.leftLeg : skin.rightLeg;
      placePart(THREE, leg, hipJ, M.sub(sole, hipJ), M.col(th, 2), lift);
      leg.scale.y = clamp(M.len(M.sub(sole, hipJ)) / LEG_LEN, .45, 1.35);
    }
    s.lift = lift; s.drawn = drawn; s.blockerLeft = blockerArmLeft; s.goalie = goalie;
    s.onL = g(pose, 'ol') > .5; s.onR = g(pose, 'or') > .5;
    if (s.onL && s.onR) { const lTop = g(pose, 'tl') <= g(pose, 'tr'); s.gripTop = lTop ? drawn[0] : drawn[1]; s.gripBot = lTop ? drawn[1] : drawn[0]; }
    else if (s.onL || s.onR) { s.gripTop = s.onL ? drawn[0] : drawn[1]; s.gripBot = null; }
    else s.gripTop = s.gripBot = null;
    s.padFrames = goalie ? [0, 1].map(i => padFrame(s, i === 0, clamp((pose.ch[i === 0 ? 'knl' : 'knr'] || [0])[0], 0, 1))) : null;
    viewer._rig = s;
    return s;
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // pad frame (RigFeature / ChaAnim.padFrame); PadModel: LEN 14.4, BOTTOM -7.4, WIDTH 7.5
  const PAD = { LEN: 14.4, BOTTOM: -7.4, WIDTH: 7.5, FRONT: 3.8, DEPTH: 3.2 };
  function padFrame(s, left, kw) {
    const th = s.W[left ? 'thl' : 'thr'], sh = s.W[left ? 'shl' : 'shr'], ft = s.W[left ? 'ftl' : 'ftr'];
    const hip = M.pos(th), sole = M.ap(ft, [0, -R.ANKLE, 0]), fwd = M.norm(M.dir(s.root, [0, 0, 1]));
    const ys = M.norm(M.sub(hip, sole)), legLen = M.len(M.sub(hip, sole));
    let zs = M.col(th, 2); zs = M.norm(M.sub(zs, M.sc(ys, M.dot(zs, ys)))); if (M.dot(zs, fwd) < 0) zs = M.sc(zs, -1);
    const os = M.add(sole, M.sc(ys, -PAD.BOTTOM));
    let yb = M.col(sh, 1); yb = [yb[0], 0, yb[2]]; if (M.len(yb) < 1e-4) yb = [left ? -1 : 1, 0, 0]; yb = M.norm(yb);
    let zb = M.norm(M.cross(yb, [0, 1, 0])); if (M.dot(zb, fwd) < 0) zb = M.sc(zb, -1);
    const knee = M.pos(sh), ob = M.sub(knee, M.sc(yb, 2.6)); ob[1] = PAD.WIDTH / 2 + .05;
    const y = M.norm(M.lerp(ys, yb, kw)); let z = M.lerp(zs, zb, kw); z = M.norm(M.sub(z, M.sc(y, M.dot(z, y))));
    const x = M.cross(y, z), o = M.lerp(os, ob, kw);
    const standLen = Math.max(.55, Math.min(1, legLen * .92 / PAD.LEN));
    return { m: M.basis(x, y, z, o), sx: .88 + .12 * kw, sy: standLen + (1 - standLen) * kw };
  }

  window.ChaRig = { M, R, PAD, load, apply, reset, solve, sample, mirror, lib: () => LIB };
})();
