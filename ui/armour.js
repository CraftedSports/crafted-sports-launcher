/* Jersey, socks and shorts the way the game draws them: the pack's armour textures on boxes grown around the body,
   arms and legs (vanilla armour: chestplate and boots +1 px, leggings +0.5 px), UV-mapped like Minecraft's cuboids.
   The player's own skin stays untouched underneath, as in game. Uses the constructors skinview3d's own meshes carry. */
(function () {
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  // faces of a Minecraft cuboid at texture offset (u,v), size (w,h,d). Regions: [u0,v0,u1,v1] in 64x32-space pixels.
  function regions(u, v, w, h, d) {
    const k = u + d, l = u + d + w, m = u + d + w + w, n = u + d + w + d, o = u + d + w + d + w, q = v + d, r = v + d + h;
    return { py: [k, v, l, q], ny: [l, v, m, q], nx: [u, q, k, r], pz: [k, q, l, r], px: [l, q, n, r], nz: [n, q, o, r] };
  }

  function boxGeo(BufGeo, Attr, w, h, d, grow, u, v, mirror, sc, img) {
    const hw = w / 2 + grow, hh = h / 2 + grow, hd = d / 2 + grow, R = regions(u, v, w, h, d);
    const pos = [], nrm = [], uv = [];
    // each face: 4 corners (bottom-left, bottom-right, top-right, top-left as seen from outside), normal, region
    const F = [
      ['px', [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], [1, 0, 0]],
      ['nx', [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], [-1, 0, 0]],
      ['py', [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]], [0, 1, 0]],
      ['ny', [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], [0, -1, 0]],
      ['pz', [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], [0, 0, 1]],
      ['nz', [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]], [0, 0, -1]],
    ];
    for (const [name, c, n] of F) {
      let key = name;
      if (mirror) key = name === 'px' ? 'nx' : name === 'nx' ? 'px' : name;       // a mirrored (left) limb swaps its side regions
      const [u0, v0, u1, v1] = R[key];
      let a = u0 * sc / img.width, b = u1 * sc / img.width;
      const t = 1 - v1 * sc / img.height, bt = 1 - v0 * sc / img.height;
      if (mirror) [a, b] = [b, a];                                                   // ...and flips every face left-right
      // top / bottom faces run front-to-back in the texture: corners listed as (back-left .. ) above map u along x, v along z
      const uvs = name === 'py' ? [[a, t], [b, t], [b, bt], [a, bt]] : name === 'ny' ? [[a, bt], [b, bt], [b, t], [a, t]] : [[a, t], [b, t], [b, bt], [a, bt]];
      for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...c[i]); nrm.push(...n); uv.push(...uvs[i]); }
    }
    const g = new BufGeo();
    g.setAttribute('position', new Attr(pos, 3)); g.setAttribute('normal', new Attr(nrm, 3)); g.setAttribute('uv', new Attr(uv, 2));
    return g;
  }

  /** layers: [{src, grow, parts:['body','leftArm',...]}]; each part's box is the skin layer's box grown by `grow`. */
  async function build(viewer, layers) {
    const skin = viewer.playerObject.skin;
    for (const k of ['body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']) {      // remove last time's armour
      const part = skin[k];
      const holders = [part, ...part.children.filter(c => c.type === 'Group')];
      for (const h of holders) for (const c of [...h.children]) if (c.name === 'chaArmour') h.remove(c);
    }
    const proto = skin.head.innerLayer, Mesh = proto.constructor, Mat = proto.material.constructor, Geo = proto.geometry.constructor;
    const BufGeo = Object.getPrototypeOf(Geo), Attr = proto.geometry.attributes.position.constructor, Tex = viewer.skinTexture.constructor;
    // Minecraft's biped layout (64x32 space): body (16,16) 8x12x4, arms (40,16), legs (0,16); left limbs are mirrored copies
    const UV = { body: [16, 16, true], leftArm: [40, 16, true], rightArm: [40, 16, false], leftLeg: [0, 16, true], rightLeg: [0, 16, false] };
    // a full player-skin layout (the CPL client's kits): every limb has its own region, nothing mirrored
    const SKIN_UV = { body: [16, 16], rightArm: [40, 16], leftArm: [32, 48], rightLeg: [0, 16], leftLeg: [16, 48] };
    for (const L of layers) {
      if (!L.src && !L.img) continue;
      const img = L.img || await load(L.src), sc = L.scale || (L.skin ? img.width / 64 : img.height / 32);
      const tex = new Tex(img); tex.magFilter = viewer.skinTexture.magFilter; tex.minFilter = viewer.skinTexture.minFilter; tex.colorSpace = viewer.skinTexture.colorSpace; tex.needsUpdate = true;
      const mat = new Mat({ map: tex, side: 2, transparent: true, alphaTest: .05 });
      for (const name of L.parts) {
        const part = skin[name], layer = part.children.find(c => c.type === 'Mesh' && c.name === 'inner') || part;
        const p = layer.geometry && layer.geometry.parameters ? layer.geometry.parameters : { width: name.endsWith('Arm') && skin.modelType === 'slim' ? 3 : 4, height: 12, depth: 4 };
        const [u, v] = L.skin ? SKIN_UV[name] : UV[name], mirror = !L.skin && name.startsWith('left');
        const mesh = new Mesh(boxGeo(BufGeo, Attr, name.endsWith('Arm') ? 4 : p.width, p.height, p.depth, L.grow, u, v, mirror && name !== 'body', sc, img), mat);
        mesh.name = 'chaArmour';
        if (name.endsWith('Arm') && p.width < 4) mesh.position.x += name === 'leftArm' ? .5 : -.5;   // slim skin: 4px-cut sleeve sits proud on the outside
        const holder = part.children.find(c => c.type === 'Group' && c.name !== 'chaArmour') || part;   // limbs keep their boxes inside an offset group
        holder.add(mesh); mesh.userData.holder = holder;
      }
    }
  }
  // ── CPL client kits ────────────────────────────────────────────────────
  // Same as the CPL client (KitTextures + KitFeatureRenderer): the kit is a player-skin-layout texture (cpl:textures/kit/
  // <kit>.png, e.g. 1536x1536) drawn as a second skin just outside the player's: shirt (body + sleeves) at 0.45 px, and
  // the legs split into three shells - shorts (rows 0-6, 0.42 px), socks (6.7-10.5, 0.3 px), boots (10.5-12, 0.36 px) -
  // with bare skin at the knee. The shirt number goes on the back from digits.png in the kit's colours (kits.json).
  const LEGS = [[0, 16], [16, 48]], KNEE_TO = 6.7;
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function legLayer(src, from, to, top, bottom) {
    const q = src.width / 64, out = canvasOf(src.width, src.height), g = out.getContext('2d');
    const copy = (x0, x1, y0, y1) => { const X = Math.round(x0), Y = Math.round(y0), W = Math.round(x1) - X, H = Math.round(y1) - Y; if (W > 0 && H > 0) g.drawImage(src, X, Y, W, H, X, Y, W, H); };
    for (const [u, v] of LEGS) {
      copy(u * q, (u + 16) * q, (v + 4 + from) * q, (v + 4 + to) * q);
      if (top) copy((u + 4) * q, (u + 8) * q, v * q, (v + 4) * q);
      if (bottom) copy((u + 8) * q, (u + 12) * q, v * q, (v + 4) * q);
    }
    return out;
  }
  function printNumber(c, digits, number, fill, outline) {
    const q = c.width / 64, faceX = Math.round(32 * q), faceW = Math.round(8 * q);
    let glyphH = Math.round(5.2 * q); const centreY = Math.round(26 * q);
    const s = String(Math.min(99, number)), cellW = digits.width / 10, cellH = digits.height;
    let scale = glyphH / cellH, gw = Math.round(cellW * scale), gap = Math.round(-0.12 * gw), total = s.length * gw + (s.length - 1) * gap;
    if (total > faceW * 0.86) { scale *= faceW * 0.86 / total; gw = Math.round(cellW * scale); glyphH = Math.round(cellH * scale); gap = Math.round(-0.12 * gw); total = s.length * gw + (s.length - 1) * gap; }
    const dc = canvasOf(digits.width, digits.height), dg = dc.getContext('2d'); dg.drawImage(digits, 0, 0);
    const dd = dg.getImageData(0, 0, digits.width, digits.height).data;
    const mask = Array.from({ length: glyphH }, () => new Uint8Array(total));
    for (let i = 0; i < s.length; i++) {
      const d = s.charCodeAt(i) - 48, gx = i * (gw + gap);
      for (let y = 0; y < glyphH; y++) for (let x = 0; x < gw; x++) {
        const sx = d * cellW + Math.min(cellW - 1, Math.floor(x / scale)), sy = Math.min(cellH - 1, Math.floor(y / scale));
        if (dd[(sy * digits.width + sx) * 4 + 3] > 110 && gx + x >= 0 && gx + x < total) mask[y][gx + x] = 1;
      }
    }
    const x0 = faceX + Math.floor((faceW - total) / 2), y0 = centreY - Math.floor(glyphH / 2), ring = Math.max(1, Math.round(q * 0.22));
    const g = c.getContext('2d'), id = g.getImageData(0, 0, c.width, c.height), px = id.data;
    const hex = h => { const n = parseInt(h.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const F = hex(fill), O = hex(outline);
    for (let y = -ring; y < glyphH + ring; y++) for (let x = -ring; x < total + ring; x++) {
      const inside = y >= 0 && y < glyphH && x >= 0 && x < total && mask[y][x];
      let near = false;
      if (!inside) for (let dy = -ring; dy <= ring && !near; dy++) for (let dx = -ring; dx <= ring && !near; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < glyphH && xx >= 0 && xx < total && mask[yy][xx] && dx * dx + dy * dy <= ring * ring) near = true;
      }
      if (!inside && !near) continue;
      const X = x0 + x, Y = y0 + y;
      if (X < faceX || X >= faceX + faceW || Y < 0 || Y >= c.height) continue;
      const i = (Y * c.width + X) * 4, col = inside ? F : O;
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  }
  /** The ChaArmour layers for a CPL kit. opts: {number, digits (src), colours: {number, outline}}. */
  async function cplLayers(src, opts = {}) {
    const img = await load(src), c = canvasOf(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    if (opts.number > 0 && opts.digits) {
      try { printNumber(c, await load(opts.digits), opts.number, opts.colours?.number || '#f4f6f8', opts.colours?.outline || '#0c2647'); } catch (e) { console.warn('kit number', e); }
    }
    const shorts = legLayer(c, 0, 6, true, false), socks = legLayer(c, KNEE_TO, 10.5, false, false), boots = legLayer(c, 10.5, 12, false, true);
    const q = c.width / 64;
    for (const [u, v] of LEGS) g.clearRect(Math.round(u * q), Math.round(v * q), Math.round(16 * q), Math.round(16 * q));   // the shirt layer keeps torso + sleeves
    return [
      { img: shorts, skin: true, grow: 0.42, parts: ['leftLeg', 'rightLeg'] },
      { img: socks, skin: true, grow: 0.3, parts: ['leftLeg', 'rightLeg'] },
      { img: boots, skin: true, grow: 0.36, parts: ['leftLeg', 'rightLeg'] },
      { img: c, skin: true, grow: 0.45, parts: ['body', 'leftArm', 'rightArm'] },
    ];
  }
  window.ChaArmour = { build, cplLayers };
})();
