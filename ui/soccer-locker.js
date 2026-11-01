/* Crafted Soccer cosmetics on a skinview3d player: ball types, boots (+ colourways), goalkeeper gloves, ball trails,
 * goal explosions, celebrations and skill moves. Shared by the launcher's Locker (football mode) and the preview page.
 * Everything is built from the constructors skinview3d's own meshes carry (the bundle doesn't export THREE). */
(function () {
  // ── catalog ────────────────────────────────────────────────────────────
  // Tournament-style balls through the eras: original designs in the spirit of each decade's match balls (no real
  // ball's artwork or brand marks). 'classic' is the pack's own ball.
  const BALLS = [
    { id: 'classic', name: 'Classic', price: 'Free' },
    { id: 'leather30', name: '1930s Laced Leather', era: 'leather30' },
    { id: 'orange60', name: '1960s Orange', era: 'orange60' },
    { id: 'panel70', name: '1970s Black & White', era: 'panel70' },
    { id: 'triad80', name: '1980s Triad', era: 'triad80' },
    { id: 'pinwheel90', name: '1990s Pinwheel', era: 'pinwheel90' },
    { id: 'final00', name: '2000s Final Gold', era: 'final00' },
    { id: 'carnival10', name: '2010s Carnival', era: 'carnival10' },
    { id: 'prism20', name: '2020s Prism', era: 'prism20' },
    { id: 'team', name: 'Club Colours', era: 'club', team: true },
  ];
  const BOOTS = [
    { id: 'standard', name: 'Standard Black', price: 'Free', base: '#18181b', accent: '#f4f4f5', style: 'plain', colours: [] },
    { id: 'speed', name: 'Speed', base: '#e6ff2e', accent: '#111111', style: 'swoosh', colours: ['#e6ff2e', '#ff3b6b', '#2ec4ff', '#ffffff', '#ff8a00'] },
    { id: 'classic', name: 'Classic', base: '#f4f4f5', accent: '#111111', style: 'stripes', colours: ['#f4f4f5', '#111111', '#c8102e', '#0b3d91'] },
    { id: 'neon', name: 'Neon', base: '#ff2fa8', accent: '#22f0ff', style: 'split', colours: ['#ff2fa8', '#7c3aed', '#22c55e', '#f97316'] },
    { id: 'laceless', name: 'Laceless', base: '#1d4ed8', accent: '#93c5fd', style: 'laceless', colours: ['#1d4ed8', '#0f172a', '#dc2626', '#16a34a', '#f8fafc'] },
    { id: 'gold', name: 'Gold', base: '#e7b93b', accent: '#3b2a05', style: 'plain', colours: [] },
  ];
  const GLOVES = [
    { id: 'standard', name: 'Standard', price: 'Free', base: '#e5e7eb', palm: '#9ca3af', cuff: '#374151' },
    { id: 'pro_white', name: 'Pro White', base: '#fafafa', palm: '#d4d4d8', cuff: '#0ea5e9' },
    { id: 'neon', name: 'Neon', base: '#a3e635', palm: '#ec4899', cuff: '#111827' },
    { id: 'blackout', name: 'Blackout', base: '#111111', palm: '#3f3f46', cuff: '#27272a' },
    { id: 'gold', name: 'Gold', base: '#eab308', palm: '#854d0e', cuff: '#422006' },
    { id: 'team', name: 'Team Colours', team: true },
  ];
  const TRAILS = [
    { id: 'none', name: 'None', price: 'Free' }, { id: 'fire', name: 'Fire' }, { id: 'frost', name: 'Frost' },
    { id: 'electric', name: 'Electric' }, { id: 'rainbow', name: 'Rainbow' }, { id: 'smoke', name: 'Smoke' },
  ];
  const EXPLOSIONS = [
    { id: 'classic', name: 'Classic', price: 'Free' }, { id: 'fire', name: 'Fire' }, { id: 'ice', name: 'Ice' },
    { id: 'rainbow', name: 'Rainbow' }, { id: 'confetti', name: 'Confetti' }, { id: 'team', name: 'Team Colours' },
  ];
  const CELLYS = [
    { id: 'fist_pump', name: 'Fist Pump', price: 'Free' }, { id: 'knee_slide', name: 'Double Knee Slide' },
    { id: 'jump_spin', name: 'Jump and Spin' }, { id: 'push_ups', name: 'Push-Ups' }, { id: 'arms_up', name: 'Shirt Off' },
    { id: 'corner_flag', name: 'Corner Flag Kick' }, { id: 'airplane', name: 'Airplane' }, { id: 'shush', name: 'Shush the Crowd' },
  ];
  // Skill moves are looks, not abilities: each one only changes the animation of something everyone can already do,
  // with exactly the same power and effect. The bicycle kick and the rainbow flick are moves in the game itself (the
  // rainbow flick animation plays for everyone), so they aren't sold here.
  const SKILLS = [
    { id: 'scorpion', name: 'Scorpion Kick', does: 'your rainbow flicks' },
    { id: 'rabona', name: 'Rabona', does: 'your crosses' },
    { id: 'stepover', name: 'Stepover', does: 'side-stepping on the ball' },
  ];

  // ── helpers ────────────────────────────────────────────────────────────
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const shade = (h, k) => { const [r, g, b] = hex(h); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  function kitOf(viewer) {
    const skin = viewer.playerObject.skin, proto = skin.head.innerLayer;
    return { skin, Mesh: proto.constructor, Mat: proto.material.constructor, Box: proto.geometry.constructor,
      BufGeo: Object.getPrototypeOf(proto.geometry.constructor), Attr: proto.geometry.attributes.position.constructor,
      Tex: viewer.skinTexture.constructor, Group: viewer.playerWrapper.constructor, V3: skin.position.constructor, st: viewer.skinTexture };
  }
  function tex(K, cvs) {
    const t = new K.Tex(cvs); t.magFilter = K.st.magFilter; t.minFilter = K.st.minFilter; t.colorSpace = K.st.colorSpace; t.needsUpdate = true; return t;
  }
  const holderOf = part => part.children.find(c => c.type === 'Group' && c.name !== 'chaArmour') || part;

  // ── textures ───────────────────────────────────────────────────────────
  let baseBall = null;
  /** One face of the ball cube (128x128, every face the same), drawn in the style of its era. */
  function ballCanvas(b, team) {
    const N = 128, c = canvas(N, N), g = c.getContext('2d');
    if (!b.era) { g.imageSmoothingEnabled = false; g.drawImage(baseBall, 0, 0, N, N); return c; }
    const C = N / 2, TAU = Math.PI * 2;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const fill = col => { g.fillStyle = col; g.fillRect(0, 0, N, N); };
    const grain = (amt, size = 1) => {           // material texture: leather grain / synthetic dimples
      for (let i = 0; i < N * N / (size * size) * .5; i++) {
        const x = rnd() * N, y = rnd() * N, a = (rnd() - .5) * amt;
        g.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`; g.fillRect(x | 0, y | 0, size, size);
      }
    };
    const poly = (cx, cy, r, n, rot) => { g.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; g[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a)); } g.closePath(); };
    const seam = (path, col = 'rgba(0,0,0,.35)', w = 1.6, stitch = 'rgba(255,255,255,.55)') => {
      g.save(); g.lineJoin = 'round'; g.strokeStyle = col; g.lineWidth = w; path(); g.stroke();
      if (stitch) { g.setLineDash([2, 3]); g.strokeStyle = stitch; g.lineWidth = .8; path(); g.stroke(); }
      g.restore();
    };
    const finish = (gloss = .22) => {             // round shading + a soft highlight so the cube reads as a ball
      const r = g.createRadialGradient(N * .36, N * .3, 4, C, C, N * .78);
      r.addColorStop(0, `rgba(255,255,255,${gloss})`); r.addColorStop(.45, 'rgba(255,255,255,0)'); r.addColorStop(.8, 'rgba(0,0,0,.12)'); r.addColorStop(1, 'rgba(0,0,0,.32)');
      g.fillStyle = r; g.fillRect(0, 0, N, N);
    };
    // the 32-panel layout: a pentagon in the middle, five hexagons round it, pentagons peeking in at the corners
    const panels32 = (pent, hexEdge, pentRot = -Math.PI / 2) => {
      const R = 21;
      const P = []; for (let i = 0; i < 5; i++) { const a = pentRot + i * TAU / 5; P.push([C + R * Math.cos(a), C + R * Math.sin(a)]); }
      const out = []; for (let i = 0; i < 5; i++) { const a = pentRot + i * TAU / 5; out.push([C + 52 * Math.cos(a), C + 52 * Math.sin(a)]); }
      seam(() => { g.beginPath(); for (let i = 0; i < 5; i++) { g.moveTo(...P[i]); g.lineTo(...out[i]); const a1 = pentRot + (i + .5) * TAU / 5; g.moveTo(C + 40 * Math.cos(a1), C + 40 * Math.sin(a1)); g.lineTo(C + 66 * Math.cos(a1), C + 66 * Math.sin(a1)); } }, hexEdge);
      seam(() => { g.beginPath(); for (let i = 0; i < 5; i++) { g.moveTo(...out[i]); g.lineTo(...out[(i + 1) % 5]); } }, hexEdge);
      g.fillStyle = pent; poly(C, C, R, 5, pentRot); g.fill();
      for (let i = 0; i < 5; i++) { const a = pentRot + (i + .5) * TAU / 5; g.fillStyle = pent; poly(C + 70 * Math.cos(a), C + 70 * Math.sin(a), 18, 5, a + Math.PI); g.fill(); }
      seam(() => { poly(C, C, R, 5, pentRot); }, 'rgba(0,0,0,.6)', 1.2, null);
    };
    switch (b.era) {
      case 'leather30': {               // brown leather: long stitched strips, darkened by wear, a laced slot
        fill('#8b5627');
        for (let i = 0; i < 6; i++) { g.fillStyle = ['#94602e', '#7f4c21', '#8b5627'][i % 3]; g.fillRect(0, i * 22 - 4, N, 22); }
        grain(.12, 1);
        seam(() => { g.beginPath(); for (let i = 1; i < 6; i++) { g.moveTo(0, i * 22 - 4); g.bezierCurveTo(40, i * 22 - 8, 88, i * 22, N, i * 22 - 4); } }, '#3e220c', 2, 'rgba(240,220,180,.6)');
        g.fillStyle = '#4b2a10'; g.beginPath(); g.roundRect(50, 34, 28, 58, 6); g.fill();
        g.strokeStyle = '#efdcb6'; g.lineWidth = 2.2; for (let y = 40; y < 88; y += 7) { g.beginPath(); g.moveTo(54, y); g.lineTo(74, y + 5); g.moveTo(74, y); g.lineTo(54, y + 5); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(rnd() * N, rnd() * N, 3 + rnd() * 6, 0, TAU); g.fill(); }   // scuffs
        finish(.12); break;
      }
      case 'orange60': {               // bright orange, 18 panels in alternating groups of three strips
        fill('#f2661a'); grain(.06, 2);
        const blk = (x, y, vert) => { seam(() => { g.beginPath(); for (let k = 1; k < 3; k++) { if (vert) { g.moveTo(x + k * 21.3, y); g.lineTo(x + k * 21.3, y + 64); } else { g.moveTo(x, y + k * 21.3); g.lineTo(x + 64, y + k * 21.3); } } g.rect(x, y, 64, 64); }, '#9c3c08', 1.6, 'rgba(255,230,200,.5)'); };
        blk(0, 0, true); blk(64, 0, false); blk(0, 64, false); blk(64, 64, true);
        finish(.25); break;
      }
      case 'panel70': {                // gloss white with black pentagons, a gold band across like the era's TV-friendly balls
        fill('#f6f3ea'); grain(.04, 2);
        panels32('#121212', 'rgba(0,0,0,.28)');
        g.fillStyle = '#c9a227'; g.fillRect(0, 98, N, 6); g.fillStyle = '#121212'; g.fillRect(0, 104, N, 2);
        finish(.32); break;
      }
      case 'triad80': {                // white with three black curved wedges round a ring, over the 32-panel seams
        fill('#f7f7f4'); grain(.03, 2);
        seam(() => { poly(C, C, 58, 6, 0); }, 'rgba(0,0,0,.18)', 1, null);
        for (const [ox, oy, sc] of [[C, C, 1], [0, 0, .6], [N, N, .6], [N, 0, .6], [0, N, .6]]) {
          for (let i = 0; i < 3; i++) {
            const a = -Math.PI / 2 + i * TAU / 3;
            g.fillStyle = '#111'; g.beginPath(); g.arc(ox, oy, 48 * sc, a - .62, a + .62); g.arc(ox, oy, 15 * sc, a + .62, a - .62, true); g.closePath(); g.fill();
            g.strokeStyle = '#f7f7f4'; g.lineWidth = 2.5 * sc; g.beginPath(); g.arc(ox, oy, 32 * sc, a - .5, a + .5); g.stroke();   // a pinstripe through each wedge
          }
          g.strokeStyle = '#111'; g.lineWidth = 3 * sc; g.beginPath(); g.arc(ox, oy, 10 * sc, 0, TAU); g.stroke();
        }
        finish(.3); break;
      }
      case 'pinwheel90': {             // white with navy and red flame blades, fine star dots, hex seams
        fill('#f8f8fc'); grain(.03, 2);
        seam(() => { poly(C, C, 44, 6, 0); }, 'rgba(40,50,110,.25)', 1.2, null);
        for (let i = 0; i < 6; i++) {
          const a = i * TAU / 6; g.fillStyle = i % 2 ? '#c62839' : '#22306f';
          g.beginPath(); g.moveTo(C + 10 * Math.cos(a), C + 10 * Math.sin(a));
          g.quadraticCurveTo(C + 40 * Math.cos(a + .1), C + 40 * Math.sin(a + .1), C + 60 * Math.cos(a + .55), C + 60 * Math.sin(a + .55));
          g.quadraticCurveTo(C + 30 * Math.cos(a + .55), C + 30 * Math.sin(a + .55), C + 10 * Math.cos(a + .5), C + 10 * Math.sin(a + .5)); g.fill();
        }
        g.fillStyle = '#f8f8fc'; g.beginPath(); g.arc(C, C, 9, 0, TAU); g.fill(); g.strokeStyle = '#22306f'; g.lineWidth = 2; g.stroke();
        for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? '#8a94c8' : '#e7a0a8'; g.fillRect(rnd() * N | 0, rnd() * N | 0, 2, 2); }
        finish(.28); break;
      }
      case 'final00': {                // pearl white, curved gold panels with black edging, a gold centre roundel
        fill('#fbf9f3'); grain(.03, 2);
        g.lineCap = 'round';
        for (const [x0, dir] of [[26, -1], [102, 1]]) {
          for (const [col, w] of [['#1d1a14', 20], ['#d4a632', 14], ['#f2d27a', 4]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, 6); g.quadraticCurveTo(x0 + dir * 20, C, x0, N - 6); g.stroke(); }
        }
        g.fillStyle = '#1d1a14'; g.beginPath(); g.arc(C, C, 15, 0, TAU); g.fill(); g.fillStyle = '#d4a632'; g.beginPath(); g.arc(C, C, 12, 0, TAU); g.fill();
        g.fillStyle = '#fbf9f3'; poly(C, C, 6, 5, -Math.PI / 2); g.fill();
        seam(() => { g.beginPath(); g.moveTo(C, 0); g.lineTo(C, 44); g.moveTo(C, 84); g.lineTo(C, N); }, 'rgba(0,0,0,.18)', 1, null);
        finish(.34); break;
      }
      case 'carnival10': {             // white with bold overlapping colour waves, each edged in black
        fill('#ffffff'); grain(.03, 2);
        g.lineCap = 'round';
        for (const [col, y] of [['#0b8a5b', 20], ['#f5b700', 44], ['#e4572e', 68], ['#2a7de1', 92], ['#8e44ad', 116]]) {
          const path = () => { g.beginPath(); g.moveTo(-8, y); g.bezierCurveTo(30, y - 26, 80, y + 26, N + 8, y - 6); };
          g.strokeStyle = '#121212'; g.lineWidth = 13; path(); g.stroke(); g.strokeStyle = col; g.lineWidth = 9; path(); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; path(); g.stroke();
        }
        seam(() => { g.beginPath(); g.arc(C, C, 40, 0, TAU); }, 'rgba(0,0,0,.15)', 1, null);
        finish(.3); break;
      }
      case 'prism20': {                // white with bright brush-stroke gradients and a fine dimple texture
        fill('#ffffff');
        const lg = g.createLinearGradient(0, 0, N, N);
        ['#ff3d6e', '#ff9f1c', '#ffe14d', '#2ec4b6', '#3a86ff', '#8338ec'].forEach((col, i) => lg.addColorStop(i / 5, col));
        g.fillStyle = lg;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-10 + i * 26, N); g.lineTo(6 + i * 26, N); g.lineTo(38 + i * 26, 0); g.lineTo(26 + i * 26, 0); g.closePath(); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.55)'; for (let y = 2; y < N; y += 4) for (let x = (y % 8 ? 2 : 0); x < N; x += 4) g.fillRect(x, y, 1, 1);   // dimples
        seam(() => { g.beginPath(); g.moveTo(10, C); g.bezierCurveTo(40, 20, 88, 108, 118, C); }, 'rgba(0,0,0,.2)', 1.2, null);
        finish(.3); break;
      }
      case 'club': {                   // white with the club's two colours sweeping round a centre roundel
        fill('#ffffff'); grain(.03, 2);
        g.lineCap = 'round';
        for (const [col, w] of [['#151515', 26], [team[0], 22], [team[1], 8]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(6, 100); g.bezierCurveTo(20, 18, 108, 110, 122, 28); g.stroke(); }
        g.fillStyle = '#151515'; g.beginPath(); g.arc(C, C, 14, 0, TAU); g.fill(); g.fillStyle = team[0]; g.beginPath(); g.arc(C, C, 11, 0, TAU); g.fill();
        g.fillStyle = team[1]; poly(C, C, 6, 5, -Math.PI / 2); g.fill();
        finish(.3); break;
      }
    }
    return c;
  }
  /** A boot: 16x16, sole along the bottom, the style's design on the upper. */
  function bootCanvas(b, colour) {
    const base = colour || b.base, c = canvas(16, 16), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 16, 16);
    g.fillStyle = shade(base, 0.82); g.fillRect(0, 0, 16, 3);                       // ankle collar
    g.fillStyle = b.style === 'plain' && b.id === 'standard' ? '#f4f4f5' : shade(base, 0.45); g.fillRect(0, 13, 16, 3);   // sole
    g.fillStyle = shade(base, 0.35); g.fillRect(0, 15, 16, 1);
    g.fillStyle = b.accent;
    if (b.style === 'swoosh') { for (let x = 1; x < 15; x++) g.fillRect(x, 10 - Math.round(x * 0.35), 1, 2); }
    if (b.style === 'stripes') { for (const x of [5, 8, 11]) g.fillRect(x, 4, 1.5, 8); }
    if (b.style === 'split') { g.fillRect(0, 8, 16, 2); g.fillStyle = shade(b.accent, 0.8); g.fillRect(0, 10, 16, 1); }
    if (b.style === 'laceless') { const gr = g.createLinearGradient(0, 3, 0, 13); gr.addColorStop(0, shade(base, 1.25)); gr.addColorStop(1, shade(base, 0.85)); g.fillStyle = gr; g.fillRect(0, 3, 16, 10); }
    if (b.style !== 'laceless') { g.fillStyle = shade(base, b.id === 'standard' ? 3 : 0.6); for (let y = 4; y < 10; y += 2) g.fillRect(6, y, 4, 1); }   // laces
    return c;
  }
  function gloveCanvas(gl, team) {
    const base = gl.team ? team[0] : gl.base, palm = gl.team ? '#e5e7eb' : gl.palm, cuff = gl.team ? team[1] : gl.cuff;
    const c = canvas(16, 16), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 16, 16);
    g.fillStyle = cuff; g.fillRect(0, 0, 16, 5);                                    // cuff + strap
    g.fillStyle = shade(cuff, 1.6); g.fillRect(0, 2, 16, 1);
    g.fillStyle = palm; g.fillRect(3, 6, 10, 10);                                   // latex palm
    g.fillStyle = shade(base, 0.7); for (const x of [4, 7, 10, 13]) g.fillRect(x, 11, 1, 5);   // finger lines
    return c;
  }

  // ── state on a viewer ──────────────────────────────────────────────────
  function attach(viewer, opts) {
    const K = kitOf(viewer);
    const S = viewer._soccer = viewer._soccer || { fx: [], anim: null, team: ['#1a5d3a', '#e8c25a'] };
    if (opts?.team) S.team = opts.team;
    return { K, S };
  }

  async function ready(ballSrc) { if (!baseBall) baseBall = await loadImg(ballSrc); }

  function feetLocal(viewer) {
    const K = kitOf(viewer), leg = viewer.playerObject.skin.leftLeg;
    viewer.playerObject.updateMatrixWorld(true);
    const w = holderOf(leg).localToWorld(new K.V3(0, -6, 0));
    return viewer.playerObject.worldToLocal(w);
  }

  /** A strip of mown pitch under the player, so the grass stays under their feet however far the camera pulls back. */
  function ground(viewer) {
    const { K, S } = attach(viewer);
    if (S.ground) return;
    const c = canvas(64, 64), g = c.getContext('2d');
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#2b6a3f' : '#24593a'; g.fillRect(i * 8, 0, 8, 64); }
    const t = tex(K, c); t.wrapS = t.wrapT = 1000; t.repeat?.set(6, 6);
    const f = feetLocal(viewer);
    const m = new K.Mesh(new K.Box(240, 1, 240), new K.Mat({ map: t }));
    m.position.set(0, f.y - 0.5, 0); m.name = 'socGround';
    viewer.playerObject.parent.add(m); S.ground = m;
  }

  /** The ball on the grass in front of the player's right foot. */
  function setBall(viewer, id) {
    const { K, S } = attach(viewer);
    const b = BALLS.find(x => x.id === id) || BALLS[0];
    if (S.ball) S.ball.parent?.remove(S.ball);
    const m = new K.Mesh(new K.Box(5, 5, 5), new K.Mat({ map: tex(K, ballCanvas(b, S.team)) }));
        m.name = 'socBall';
    viewer.playerObject.add(m);
    S.ball = m; S.ballId = b.id;
    ground(viewer);
    resetBall(viewer);
  }
  function resetBall(viewer) {
    const S = viewer._soccer; if (!S?.ball) return;
    const f = feetLocal(viewer);
    S.ball.position.set(f.x - 3, f.y + 2.5, f.z + 10.5); S.ball.rotation.set(0, 0.4, 0); S.ball.visible = true;
    S.home = S.ball.position.clone();
  }

  /** Boots: a box over each foot (the kit's own boots stay under it, as in the CPL client). */
  function setBoots(viewer, id, colour) {
    const { K, S } = attach(viewer);
    const b = BOOTS.find(x => x.id === id) || BOOTS[0];
    for (const m of S.boots || []) m.parent?.remove(m);
    S.boots = [];
    const t = tex(K, bootCanvas(b, colour));
    for (const leg of ['leftLeg', 'rightLeg']) {
      const m = new K.Mesh(new K.Box(4.9, 2.1, 5.4), new K.Mat({ map: t }));
      m.position.set(0, -5.0, 0.3);   // over the kit's boot rows (10.5-12 down the leg, as the CPL client splits them): the socks stay in view m.name = 'socBoot';
      holderOf(viewer.playerObject.skin[leg]).add(m); S.boots.push(m);
    }
    S.bootId = b.id; S.bootColour = colour || null;
  }

  /** Goalkeeper gloves on both hands, or none. */
  function setGloves(viewer, id) {
    const { K, S } = attach(viewer);
    for (const m of S.gloves || []) m.parent?.remove(m);
    S.gloves = [];
    if (!id) { S.gloveId = null; return; }
    const gl = GLOVES.find(x => x.id === id) || GLOVES[0];
    const t = tex(K, gloveCanvas(gl, S.team));
    for (const arm of ['leftArm', 'rightArm']) {
      const m = new K.Mesh(new K.Box(5.7, 4.6, 5.7), new K.Mat({ map: t }));
      m.position.set(0, -4.0, 0); m.name = 'socGlove';
      holderOf(viewer.playerObject.skin[arm]).add(m); S.gloves.push(m);
    }
    S.gloveId = gl.id;
  }

  // ── particles ──────────────────────────────────────────────────────────
  function quadGeo(K, s) {
    const g = new K.BufGeo(), h = s / 2;
    g.setAttribute('position', new K.Attr([-h, -h, 0, h, -h, 0, h, h, 0, -h, -h, 0, h, h, 0, -h, h, 0], 3));
    g.setAttribute('normal', new K.Attr([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    return g;
  }
  function spark(viewer, pos, vel, colour, life, size, opts = {}) {
    const { K, S } = attach(viewer);
    const m = new K.Mesh(quadGeo(K, size), new K.Mat({ color: colour, transparent: true, opacity: 1, depthWrite: false, side: 2 }));
    if (m.material.emissive) { m.material.emissive.set(colour); m.material.emissiveIntensity = opts.glow ?? 0.8; }
    m.position.copy(pos); viewer.playerObject.add(m);
    S.fx.push({ m, vel: vel.clone(), life, age: 0, grow: opts.grow || 0, grav: opts.grav ?? 0, spin: (Math.random() - .5) * .3 });
  }
  const TRAIL_STYLE = {
    fire: i => ({ c: ['#ff3d00', '#ff9100', '#ffd54f'][i % 3], life: 0.45, size: 1.6, grow: -1.5, up: 3 }),
    frost: i => ({ c: ['#e0f7ff', '#8fd8ff', '#ffffff'][i % 3], life: 0.7, size: 1.0, grow: -0.6, up: -1 }),
    electric: i => ({ c: i % 2 ? '#7df9ff' : '#ffffff', life: 0.25, size: 1.2, grow: 0, up: 0, jitter: 3 }),
    rainbow: i => ({ c: `hsl(${(i * 23) % 360},95%,60%)`, life: 0.6, size: 1.4, grow: -1, up: 0 }),
    smoke: i => ({ c: ['#9ca3af', '#6b7280', '#d1d5db'][i % 3], life: 0.9, size: 1.4, grow: 3, up: 2 }),
  };
  const BURST = {
    classic: i => ['#ffffff', '#fde68a', '#facc15'][i % 3], fire: i => ['#ff3d00', '#ff9100', '#ffd54f'][i % 3],
    ice: i => ['#e0f7ff', '#7dd3fc', '#ffffff'][i % 3], rainbow: i => `hsl(${(i * 37) % 360},95%,60%)`,
    confetti: i => ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#ffffff'][i % 6],
  };

  // ── the loop ───────────────────────────────────────────────────────────
  let raf = 0, last = 0;
  function loop(viewer) {
    const tick = now => {
      const S = viewer._soccer || (viewer._soccer = { fx: [], anim: null, team: ['#1a5d3a', '#e8c25a'] });
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (S.anim) { S.anim.t += dt; if (S.anim.step(S.anim.t, dt) === false) { const done = S.anim.done; S.anim = null; done && done(); } }
      for (let i = S.fx.length - 1; i >= 0; i--) {
        const p = S.fx[i]; p.age += dt;
        if (p.age >= p.life) { p.m.parent?.remove(p.m); S.fx.splice(i, 1); continue; }
        p.vel.y -= p.grav * dt; p.m.position.addScaledVector(p.vel, dt);
        p.m.material.opacity = 1 - p.age / p.life; p.m.rotation.z += p.spin;
        const s = Math.max(0.05, 1 + p.grow * p.age); p.m.scale.set(s, s, s);
        p.m.quaternion.copy(viewer.camera.quaternion);       // face the camera
      }
      raf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }

  // ── poses ──────────────────────────────────────────────────────────────
  const P = Math.PI;
  function rest(viewer) {
    const o = viewer.playerObject, s = o.skin;
    o.position.set(0, 0, 0); o.rotation.order = 'XYZ'; o.rotation.set(0, 0, 0);
    for (const k of ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']) s[k].rotation.set(0, 0, 0);
  }
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const lerp = (a, b, u) => a + (b - a) * u;

  /** Plays one move: f(t) poses the player; returns false when finished. */
  function play(viewer, len, f, done, zoom) {
    const { S } = attach(viewer);
    viewer.animation = null;
    const z0 = S.zoom0 ?? (S.zoom0 = viewer.zoom);
    if (zoom) viewer.zoom = zoom;
    const fin = done; done = () => { viewer.zoom = z0; fin && fin(); };
    S.anim = { t: 0, step: (t, dt) => { rest(viewer); f(Math.min(t, len), viewer.playerObject, viewer.playerObject.skin, dt); return t < len; }, done: () => { rest(viewer); resetBall(viewer); done && done(); } };
  }

  /** The ball off the foot: along a path for len seconds, with a trail and (optionally) a goal burst at the end. */
  function flyBall(viewer, len, path, trail, burst) {
    const { K, S } = attach(viewer);
    if (!S.ball) return;
    const start = S.ball.position.clone(); let n = 0, burstDone = false;
    S.ballFlight = (t) => {
      const u = Math.min(1, t / len), p = path(u, start);
      S.ball.position.copy(p); S.ball.rotation.x += 0.35; S.ball.rotation.z += 0.12;
      const st = TRAIL_STYLE[trail];
      if (st && u < 1) for (let k = 0; k < 3; k++, n++) {
        const s = st(n), j = s.jitter || 0;
        const v = new K.V3((Math.random() - .5) * (2 + j * 6), s.up + (Math.random() - .5) * (2 + j * 6), (Math.random() - .5) * (2 + j * 6));
        spark(viewer, p.clone().add(new K.V3((Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2)), v, s.c, s.life, s.size, { grow: s.grow });
      }
      if (u >= 1 && burst && !burstDone) { burstDone = true; explode(viewer, p, burst); }
    };
  }
  function explode(viewer, at, id) {
    const { K, S } = attach(viewer);
    const colour = id === 'team' ? (i => S.team[i % 2]) : BURST[id] || BURST.classic;
    const n = id === 'confetti' ? 90 : 70;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * P * 2, e = (Math.random() - .3) * P * .9, sp = 10 + Math.random() * 18;
      const v = new K.V3(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 8, Math.sin(a) * Math.cos(e) * sp);
      spark(viewer, at.clone(), v, colour(i), 0.9 + Math.random() * .8, id === 'confetti' ? 1.1 : 1.3, { grav: id === 'confetti' ? 14 : 22, glow: id === 'ice' ? .4 : .9 });
    }
  }

  // The goal for explosions: two posts and a bar off to the player's right
  function goal(viewer, show) {
    const { K, S } = attach(viewer);
    if (!S.goal) {
      const g = new K.Group(), white = new K.Mat({ color: '#f5f5f5' }), net = new K.Mat({ color: '#ffffff', transparent: true, opacity: .18, side: 2 });
      const f = feetLocal(viewer), y0 = f.y - 0.5;
      for (const z of [-11, 11]) { const p = new K.Mesh(new K.Box(1, 15, 1), white); p.position.set(0, y0 + 7.5, z); g.add(p); }
      const bar = new K.Mesh(new K.Box(1, 1, 23), white); bar.position.set(0, y0 + 15, 0); g.add(bar);
      const back = new K.Mesh(new K.Box(0.2, 15, 22), net); back.position.set(-6, y0 + 7.5, 0); g.add(back);
      g.position.set(-40, 0, -4); g.rotation.y = 0;
      viewer.playerObject.add(g); S.goal = g;
    }
    S.goal.visible = show;
  }

  // ── public moves ───────────────────────────────────────────────────────
  function kick(viewer, trail, onDone) {
    const S = attach(viewer).S; goal(viewer, false);
    play(viewer, 1.6, (t, o, s) => {
      const u = ease(t / 0.35);
      s.rightLeg.rotation.x = t < 0.35 ? lerp(0, 0.9, u) : lerp(0.9, -1.1, ease((t - 0.35) / 0.15));
      s.leftArm.rotation.x = -0.6 * Math.min(1, t * 3); s.rightArm.rotation.x = 0.4 * Math.min(1, t * 3);
      o.rotation.y = -0.5;
      if (t >= 0.45 && S.ballFlight) S.ballFlight(t - 0.45);
    }, onDone, 0.34);
    flyBall(viewer, 0.9, (u, st) => st.clone().add(new (kitOf(viewer).V3)(-48 * u, 9 * Math.sin(P * u), -6 * u)), trail);
  }
  function shootAtGoal(viewer, trail, burst, onDone) {
    const S = attach(viewer).S; goal(viewer, true);
    play(viewer, 2.4, (t, o, s) => {
      const u = ease(t / 0.35);
      s.rightLeg.rotation.x = t < 0.35 ? lerp(0, 0.9, u) : lerp(0.9, -1.2, ease((t - 0.35) / 0.15));
      s.leftArm.rotation.x = -0.6 * Math.min(1, t * 3);
      o.rotation.y = -0.6;
      if (t >= 0.45 && S.ballFlight) S.ballFlight(t - 0.45);
      if (t > 1.3) { const a = Math.min(1, (t - 1.3) * 3); s.rightArm.rotation.x = -P * 0.9 * a; s.leftArm.rotation.x = -P * 0.9 * a; o.position.y = Math.abs(Math.sin((t - 1.3) * 7)) * 2 * a; }
    }, () => { goal(viewer, false); onDone && onDone(); }, 0.3);
    flyBall(viewer, 0.75, (u, st) => st.clone().add(new (kitOf(viewer).V3)(-36 * u, 6 * Math.sin(P * u * 0.8), -4 * u)), trail, burst);
  }

  const CELLY_F = {
    // a punch up and out, not straight up: arm at about head height, pumping, with a little bounce
    fist_pump: (t, o, s) => {
      const k = ease(t / 0.25), pump = Math.sin(t * 9);
      s.rightArm.rotation.x = (-2.0 + pump * 0.22) * k; s.rightArm.rotation.z = -0.35 * k;
      s.leftArm.rotation.x = 0.25 * k; s.leftArm.rotation.z = 0.35 * k;
      s.body.rotation.x = -0.08 * k; s.head.rotation.x = -0.3 * k;
      o.position.y = Math.max(0, pump) * 1.0 * k;
      s.leftLeg.rotation.x = -0.15 * k; s.rightLeg.rotation.x = 0.1 * k;
    },
    knee_slide: (t, o, s) => {
      const d = ease(t / 0.5);                                      // drop to the knees, then slide
      o.position.y = -6 * d; o.position.z = 14 * ease(t / 1.6);
      s.leftLeg.rotation.x = 1.5 * d; s.rightLeg.rotation.x = 1.5 * d;
      s.body.rotation.x = -0.35 * d; s.head.rotation.x = -0.5 * d;
      s.leftArm.rotation.z = 2.3 * d; s.rightArm.rotation.z = -2.3 * d; s.leftArm.rotation.x = -0.4 * d; s.rightArm.rotation.x = -0.4 * d;
    },
    // crouch and load, spring up swinging the arms, a full turn in the air with the knees tucked, then land wide
    // and roar at the crowd with both fists
    jump_spin: (t, o, s) => {
      const load = ease(t / 0.25) * (1 - ease((t - 0.25) / 0.1));
      const air = t > 0.3 && t < 1.05 ? Math.sin(P * (t - 0.3) / 0.75) : 0;
      const tuck = t > 0.35 && t < 1.0 ? Math.sin(P * (t - 0.35) / 0.65) : 0;
      const land = ease((t - 1.05) / 0.12), roar = ease((t - 1.2) / 0.2);
      o.position.y = -2.2 * load + 11 * air - 1.6 * land * (1 - roar * 0.6);
      o.rotation.y = 2 * P * ease((t - 0.3) / 0.75);
      s.leftArm.rotation.x = 0.6 * load - 2.6 * tuck; s.rightArm.rotation.x = 0.6 * load - 2.6 * tuck;   // back, then up as you go
      s.leftArm.rotation.z = 0.35 * tuck; s.rightArm.rotation.z = -0.35 * tuck;
      s.leftLeg.rotation.x = -0.5 * load - 1.1 * tuck; s.rightLeg.rotation.x = -0.5 * load - 0.7 * tuck;  // knees up in the air
      s.body.rotation.x = 0.15 * load;
      s.leftLeg.rotation.z += 0.3 * land; s.rightLeg.rotation.z += -0.3 * land;                         // land wide
      s.leftArm.rotation.z += 1.1 * land; s.rightArm.rotation.z += -1.1 * land;                         // fists out...
      s.leftArm.rotation.x += -0.5 * roar; s.rightArm.rotation.x += -0.5 * roar;                        // ...and up a bit
      s.head.rotation.x = -0.45 * roar; s.body.rotation.x += -0.12 * roar;
      o.position.y += Math.abs(Math.sin(t * 10)) * 0.6 * roar;
    },
    // face down on the grass, hands under the shoulders (lifted so nothing sinks into the pitch), pressing up
    push_ups: (t, o, s) => {
      // lie down side-on to the camera; hands on the grass: arms straight = chest 12 up (o.y -4), down = chest on it (-13)
      const down = ease(t / 0.5), rep = t > 0.5 ? (1 - Math.cos((t - 0.5) * 7)) / 2 : 0;
      o.rotation.order = 'YXZ'; o.rotation.y = P / 2 * down; o.rotation.x = P / 2 * down;
      o.position.y = lerp(0, -4 - 8.5 * (1 - rep), down);
      const arm = -P / 2 * down * (1 - 0.45 * (1 - rep) * down);            // arms fold back a bit at the bottom
      s.leftArm.rotation.x = arm; s.rightArm.rotation.x = arm;
      s.leftArm.rotation.z = 0.25 * down; s.rightArm.rotation.z = -0.25 * down;
      s.head.rotation.x = -0.6 * down;
    },
    // grab the hem, pull the shirt up and over the head, then run off swinging it round above your head
    arms_up: (t, o, s) => {
      const pull = ease(t / 0.55), off = ease((t - 0.55) / 0.15), run = ease((t - 0.7) / 0.2);
      const r = t * 10;
      // pulling: arms cross low and then lift straight up over the head
      s.leftArm.rotation.x = lerp(-0.4, -P * 0.95, pull) * (1 - run); s.rightArm.rotation.x = lerp(-0.4, -P * 0.95, pull) * (1 - run);
      s.leftArm.rotation.z = lerp(-0.45, 0.2, pull) * (1 - run); s.rightArm.rotation.z = lerp(0.45, -0.2, pull) * (1 - run);
      s.head.rotation.x = 0.35 * pull * (1 - off);
      // running off with it: the right arm whirls it overhead, the left pumps
      s.rightArm.rotation.x += -2.9 * run; s.rightArm.rotation.z += (-0.3 + 0.35 * Math.sin(r * 1.4)) * run;
      s.leftArm.rotation.x += Math.sin(r) * 0.8 * run;
      s.leftLeg.rotation.x = Math.sin(r) * 0.85 * run; s.rightLeg.rotation.x = -Math.sin(r) * 0.85 * run;
      s.head.rotation.x += -0.35 * run;
      o.position.z = 16 * Math.max(0, t - 0.75); o.position.y = Math.abs(Math.sin(r)) * 1.2 * run;
      const shirt = s._shirt; if (shirt) { shirt.visible = t > 0.5; shirt.rotation.y = r * 1.4 * run; }
    },
    // run at the flag, take off, and volley it mid-air - lead leg out, leaning back, arms flung out
    corner_flag: (t, o, s) => {
      const r = t * 10;
      if (t < 0.9) {
        s.leftLeg.rotation.x = Math.sin(r) * 0.9; s.rightLeg.rotation.x = -Math.sin(r) * 0.9;
        s.leftArm.rotation.x = -Math.sin(r) * 0.7; s.rightArm.rotation.x = Math.sin(r) * 0.7; o.position.z = 8 * t;
        return;
      }
      const u = t - 0.9, air = u < 0.6 ? Math.sin(P * u / 0.6) : 0, kick = ease((u - 0.12) / 0.12) * (1 - ease((u - 0.5) / 0.2));
      const land = ease((u - 0.6) / 0.15);
      o.position.z = 7.2 + 6 * ease(u / 0.6); o.position.y = 9 * air;
      s.rightLeg.rotation.x = lerp(0.7 * ease(u / 0.12), -1.9, kick);              // wind up, then lash out at the flag
      s.leftLeg.rotation.x = 0.9 * air * (1 - land);                              // trailing leg tucked under
      s.body.rotation.x = -0.35 * kick; s.head.rotation.x = -0.2 * kick;          // leaning back into it
      s.leftArm.rotation.z = 1.4 * air; s.rightArm.rotation.z = -1.1 * air;
      s.leftArm.rotation.x = -0.5 * air; s.rightArm.rotation.x = 0.4 * air;
      s.leftArm.rotation.z += 0.8 * land; s.rightArm.rotation.z += -0.8 * land;   // landed: arms out to the crowd
      s.leftArm.rotation.x += -1.2 * land; s.rightArm.rotation.x += -1.2 * land;
      const flag = s._flag; if (flag) flag.rotation.x = -1.0 * ease((u - 0.22) / 0.15);   // and down it goes
    },
    airplane: (t, o, s) => { s.leftArm.rotation.z = P / 2; s.rightArm.rotation.z = -P / 2; o.rotation.z = Math.sin(t * 3) * 0.3; o.rotation.y = Math.sin(t * 1.5) * 0.6; const r = t * 9; s.leftLeg.rotation.x = Math.sin(r) * 0.6; s.rightLeg.rotation.x = -Math.sin(r) * 0.6; },
    // finger to the lips, leaning in at the crowd, turning slowly to each side of the stand
    shush: (t, o, s) => {
      // finger up to the lips (hand in front of the face), leaning in at the crowd, turning to each side of the stand
      const k = ease(t / 0.35);
      s.rightArm.rotation.x = -2.55 * k; s.rightArm.rotation.z = 0.6 * k;
      s.leftArm.rotation.x = -0.35 * k; s.leftArm.rotation.z = 0.75 * k;                                       // other arm out, palm down
      s.body.rotation.x = 0.12 * k; s.head.rotation.x = 0.25 * k;                                              // chin down into the finger
      const look = Math.sin((t - 0.35) * 2.2) * 0.5 * k;
      o.rotation.y = look;
      s.leftLeg.rotation.x = -0.2 * k; s.rightLeg.rotation.x = 0.2 * k;
    },
  };
  const SKILL_F = {
    // Chip, rainbow-flick style: step past the ball, roll it up the back of the standing leg with the other heel and
    // flick it up over your own head. Same chip as anyone else's - it just looks better.
    rainbow_flick: (t, o, s) => {
      const r = t * 10, jog = 1 - ease((t - 0.3) / 0.15);
      s.rightLeg.rotation.x = Math.sin(r) * 0.5 * jog; s.leftLeg.rotation.x = -Math.sin(r) * 0.5 * jog;
      s.rightArm.rotation.x = -Math.sin(r) * 0.4 * jog; s.leftArm.rotation.x = Math.sin(r) * 0.4 * jog;
      const over = ease((t - 0.35) / 0.15) * (1 - ease((t - 0.5) / 0.08));     // right foot steps over in front of it...
      const heel = ease((t - 0.52) / 0.1) * (1 - ease((t - 0.85) / 0.3));     // ...then the heel snaps up behind
      s.rightLeg.rotation.x += -0.45 * over + 2.0 * heel;
      s.leftLeg.rotation.x += -0.15 * heel;                                     // standing leg, a touch forward
      o.position.y = 2.2 * Math.max(0, Math.sin(P * (t - 0.55) / 0.35)) * (t > 0.55 && t < 0.9 ? 1 : 0);
      const arms = ease((t - 0.45) / 0.15) * (1 - ease((t - 1.0) / 0.3));
      s.leftArm.rotation.z += 0.9 * arms; s.rightArm.rotation.z += -0.9 * arms;
      s.head.rotation.x = -0.75 * ease((t - 0.6) / 0.2) * (1 - ease((t - 1.15) / 0.25)); // eyes up, following it over
    },
    // Cross, rabona style: plant the left foot, swing the right leg round the back of it and strike across the body.
    // Rainbow flick, scorpion style: lean right over, the heel whips up behind and over the head to flick it on.
    scorpion: (t, o, s) => {
      const r = t * 10, jog = 1 - ease((t - 0.3) / 0.15);
      s.rightLeg.rotation.x = Math.sin(r) * 0.5 * jog; s.leftLeg.rotation.x = -Math.sin(r) * 0.5 * jog;
      s.rightArm.rotation.x = -Math.sin(r) * 0.4 * jog; s.leftArm.rotation.x = Math.sin(r) * 0.4 * jog;
      const lean = ease((t - 0.4) / 0.18) * (1 - ease((t - 0.95) / 0.3));
      const heel = ease((t - 0.5) / 0.14) * (1 - ease((t - 0.9) / 0.3));
      o.rotation.x = 0.55 * lean;                                               // chest dives forward...
      s.rightLeg.rotation.x += 2.9 * heel;                                      // ...the heel comes right up over the back
      s.leftLeg.rotation.x += -0.5 * lean;                                      // standing leg stays under you
      s.leftArm.rotation.z += 1.3 * lean; s.rightArm.rotation.z += -1.3 * lean;
      s.leftArm.rotation.x += -0.4 * lean; s.rightArm.rotation.x += -0.4 * lean;
      s.head.rotation.x = -0.9 * lean;                                          // eyes up the pitch
    },
    rabona: (t, o, s) => {
      const r = t * 10, jog = 1 - ease((t - 0.3) / 0.12);
      s.rightLeg.rotation.x = Math.sin(r) * 0.5 * jog; s.leftLeg.rotation.x = -Math.sin(r) * 0.5 * jog;
      const back = ease((t - 0.3) / 0.15), strike = ease((t - 0.5) / 0.12), fin = 1 - ease((t - 0.9) / 0.35);
      s.leftLeg.rotation.x += -0.25 * back * fin;                               // planted, leaning on it
      s.leftLeg.rotation.z += 0.12 * back * fin;
      s.rightLeg.rotation.x += lerp(0.9 * back, -0.55, strike) * fin;          // wound up behind...
      s.rightLeg.rotation.z += lerp(0.25 * back, 0.85, strike) * fin;          // ...and wrapped round, across the body
      o.rotation.y = 0.35 * back * fin;
      s.leftArm.rotation.z += 1.0 * back * fin; s.rightArm.rotation.z += -0.5 * back * fin;
      s.rightArm.rotation.x += -0.5 * strike * fin;
      s.head.rotation.y = -0.4 * strike * fin;                                  // eyes on where the cross goes
    },
    // Side-step on the ball, stepover style: each foot circles over the ball from the inside out while the shoulders
    // sell the fake, then you go the other way with it.
    stepover: (t, o, s) => {
      const cyc = (t0, sign) => {                                               // one stepover, 0.42 s
        const u = (t - t0) / 0.42; if (u < 0 || u > 1) return;
        const lift = Math.sin(P * u);                                           // up and over...
        const sweep = lerp(0.35, -0.5, ease(u));                                // ...from inside the ball to outside it
        const leg = sign > 0 ? s.rightLeg : s.leftLeg;
        leg.rotation.x += -0.75 * lift; leg.rotation.z += sign * -sweep * lift;
        (sign > 0 ? s.leftLeg : s.rightLeg).rotation.x += 0.12 * lift;          // standing knee soft
        const dip = Math.sin(P * Math.min(1, u * 1.15));                        // drop the shoulder the way you fake
        o.rotation.z += sign * 0.13 * dip; o.rotation.y += sign * -0.22 * dip;
        s.rightArm.rotation.z += -0.45 - (sign > 0 ? 0.25 : 0) * dip; s.leftArm.rotation.z += 0.45 + (sign < 0 ? 0.25 : 0) * dip;
        s.head.rotation.y = sign * -0.25 * dip;
      };
      const crouch = ease(t / 0.15) * (1 - ease((t - 1.25) / 0.25));
      o.position.y = -0.8 * crouch;
      cyc(0.1, 1); cyc(0.52, -1);
      if (t > 0.94) {                                                           // and away: outside of the right foot
        const k = ease((t - 0.94) / 0.14) * (1 - ease((t - 1.2) / 0.25));
        s.rightLeg.rotation.x += -0.6 * k; s.rightLeg.rotation.z += 0.35 * k;
        o.rotation.y += 0.3 * k; s.leftArm.rotation.z += 0.6 * k; s.rightArm.rotation.z += -0.3 * k;
      }
    },
  };
  /** Props some celebrations need: the shirt in your hand (shirt off) and the corner flag. Gone when it ends. */
  function props(viewer, id) {
    const { K, S } = attach(viewer), sk = viewer.playerObject.skin, made = [];
    if (id === 'arms_up') {
      const shirt = new K.Mesh(new K.Box(7, 9, 1), new K.Mat({ color: S.team[0] }));
      shirt.position.set(0, -11, 0); sk.rightArm.add(shirt); sk._shirt = shirt; shirt.visible = false; made.push(shirt);
    }
    if (id === 'corner_flag') {
      const f = feetLocal(viewer), g = new K.Group();
      const pole = new K.Mesh(new K.Box(0.6, 16, 0.6), new K.Mat({ color: '#f5f5f5' })); pole.position.set(0, 8, 0); g.add(pole);
      const cloth = new K.Mesh(new K.Box(0.2, 4, 5), new K.Mat({ color: S.team[1] || '#e8c25a' })); cloth.position.set(0, 14, 2.6); g.add(cloth);
      g.position.set(f.x - 2, f.y - 0.5, f.z + 15); viewer.playerObject.parent.add(g); sk._flag = g; made.push(g);
    }
    return () => { for (const m of made) m.parent?.remove(m); sk._shirt = sk._flag = null; };
  }
  function celebrate(viewer, id, onDone) {
    goal(viewer, false);
    const tidy = props(viewer, id);
    const S = attach(viewer).S; if (S.ball) S.ball.visible = false;   // no ball in a celebration (it comes back after)
    play(viewer, 2.3, CELLY_F[id] || CELLY_F.fist_pump, () => { tidy(); onDone && onDone(); }, ['knee_slide', 'corner_flag', 'arms_up'].includes(id) ? 0.5 : 0);
  }
  function skill(viewer, id, trail, onDone) {
    const S = attach(viewer).S; goal(viewer, false);
    const f = SKILL_F[id] || SKILL_F.scorpion, V = kitOf(viewer).V3;
    const paths = {
      // back toward the heel, up over the head, and down in front
      scorpion: [0.6, 0.9, (u, st) => st.clone().add(new V(1.5 * u, 40 * Math.sin(P * Math.pow(u, 0.8)), u < 0.3 ? -16 * ease(u / 0.3) : lerp(-16, 34, ease((u - 0.3) / 0.7))))],
      rabona: [0.58, 0.8, (u, st) => st.clone().add(new V(36 * u, 7 * Math.sin(P * u), 26 * u))],
      stepover: [1.0, 0.6, (u, st) => st.clone().add(new V(14 * u, 0, 9 * u))],
    };
    const pth = paths[id];
    play(viewer, 1.6, (t, o, s) => { f(t, o, s); if (pth && t >= pth[0] && S.ballFlight) S.ballFlight(t - pth[0]); }, onDone, pth ? 0.38 : 0);
    if (pth) {
      flyBall(viewer, pth[1], pth[2], trail);
    } else S.ballFlight = null;
  }

  function poseAt(viewer, kind, id, t) { rest(viewer); viewer.animation = null; const f = (kind === 'skill' ? SKILL_F : CELLY_F)[id]; f && f(t, viewer.playerObject, viewer.playerObject.skin, 0); }
  /** Takes every football piece off the viewer (back to the hockey Locker). */
  function clear(viewer) {
    const S = viewer._soccer; if (!S) return;
    for (const m of [S.ball, S.ground, S.goal, ...(S.boots || []), ...(S.gloves || []), ...S.fx.map(p => p.m)]) m?.parent?.remove(m);
    if (S.anim) { S.anim = null; rest(viewer); }
    if (S.zoom0 != null) viewer.zoom = S.zoom0;
    viewer._soccer = null;
  }
  window.SoccerLocker = { poseAt, clear, BALLS, BOOTS, GLOVES, TRAILS, EXPLOSIONS, CELLYS, SKILLS, ready, setBall, setBoots, setGloves, kick, shootAtGoal, celebrate, skill, loop, rest, resetBall, ballCanvas: b => ballCanvas(b, ['#1a5d3a', '#e8c25a']), bootCanvas, gloveCanvas };
})();
