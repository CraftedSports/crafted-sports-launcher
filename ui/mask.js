/* Goalie masks from the pack's own block-model JSON (elements + face UVs), placed on the head the way the game's
   head slot does it (display.head: scale, translation; vanilla head items are drawn at 0.625). */
(function () {
  const NAMES = ['north', 'south', 'west', 'east', 'up', 'down'];
  function corners(x0, y0, z0, x1, y1, z1) {
    return [[[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
      [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]],
      [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]];
  }
  function rot(p, r) {
    if (!r || !r.angle) return p;
    const a = r.angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), o = r.origin || [8, 8, 8];
    let [x, y, z] = [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
    if (r.axis === 'x') [y, z] = [y * c - z * s, y * s + z * c];
    else if (r.axis === 'y') [x, z] = [x * c + z * s, -x * s + z * c];
    else [x, y] = [x * c - y * s, x * s + y * c];
    return [x + o[0], y + o[1], z + o[2]];
  }
  const keys = () => Object.keys(window.CHA_MASKS || {});
  async function build(viewer, key) {
    const m = (window.CHA_MASKS || {})[key]; if (!m) return null;
    const head = viewer.playerObject.skin.head, proto = head.innerLayer, Mesh = proto.constructor, Mat = proto.material.constructor;
    const Geo = proto.geometry.constructor, BufGeo = Object.getPrototypeOf(Geo), Attr = proto.geometry.attributes.position.constructor, Tex = viewer.skinTexture.constructor;
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '../assets/cosmetics/masks/' + m.texture; });
    const tex = new Tex(img); tex.magFilter = viewer.skinTexture.magFilter; tex.minFilter = 1008; tex.generateMipmaps = true; tex.anisotropy = 8;   // big pack textures drawn small: mipmaps keep them from shimmering (1008 = LinearMipmapLinear) tex.colorSpace = viewer.skinTexture.colorSpace; tex.needsUpdate = true;
    const ts = [16, 16];   // the game reads face UVs in 0-16 whatever texture_size says (that's Blockbench's own field)
    const sc = (m.head.scale || [1, 1, 1]).map(v => v * .625), tr = (m.head.translation || [0, 0, 0]).map(v => v * .625);
    // the head layer turns the item round (Y 180) and flips it into model space: the model's north face ends up as the
    // front of the face, its +x on the player's right
    const place = p => [-(sc[0] * (p[0] - 8) + tr[0]), 4 + tr[1] + sc[1] * (p[1] - 8), -(sc[2] * (p[2] - 8) + tr[2])];
    const pos = [], nrm = [], uv = [];
    for (const e of m.elements) {
      const cs = corners(...e.from, ...e.to);
      NAMES.forEach((n, k) => {
        const f = e.faces[n]; if (!f) return;
        const q = f.uv || [0, 0, 16, 16];
        if (Math.abs(q[2] - q[0]) < 1e-6 || Math.abs(q[3] - q[1]) < 1e-6) return;   // zero-size faces (flat elements' edges) would smear
        let t = [[q[0], q[3]], [q[2], q[3]], [q[2], q[1]], [q[0], q[1]]];
        for (let r = 0; r < (f.rotation || 0) / 90; r++) t = [t[3], t[0], t[1], t[2]];
        const P = cs[k].map(p => place(rot(p, e.rotation)));
        const a = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], b = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
        let nn = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; const l = Math.hypot(...nn) || 1; nn = nn.map(v => v / l);
        for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...P[i]); nrm.push(...nn); uv.push(t[i][0] / ts[0], 1 - t[i][1] / ts[1]); }
      });
    }
    const g = new BufGeo(); g.setAttribute('position', new Attr(pos, 3)); g.setAttribute('normal', new Attr(nrm, 3)); g.setAttribute('uv', new Attr(uv, 2));
    return new Mesh(g, new Mat({ map: tex, side: 2, transparent: true, alphaTest: .05 }));
  }
  window.ChaMask = { build, keys };
})();
