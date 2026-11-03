'use strict';
/* Crafted Sports launcher - the page. Talks to the app through window.cs (preload.js). */
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let S = { instances: [], current: null, account: null, global: {}, running: false, busy: false };

const SWATCHES = ['', '#00ff85', '#04f5ff', '#ff2882', '#e9ff00', '#ff7a1a', '#8a5cff', '#ffffff'];

// ── loading screen ──────────────────────────────────────────────────────

const SPLASH_LINES = ['Warming up', 'Signing you in', 'Checking for updates', 'Lacing up the skates', 'Pumping up the ball', 'Almost there'];
let splashLine = 0;
const splashTimer = setInterval(() => {
  const t = $('splashText');
  splashLine = Math.min(splashLine + 1, SPLASH_LINES.length - 1);
  t.style.opacity = 0;
  setTimeout(() => { t.textContent = SPLASH_LINES[splashLine]; t.style.opacity = 1; }, 200);
}, 1100);
const splashStart = Date.now();

/** Waits for every image on the first screen (logos, avatar, background) and the fonts - at most 6 s so a slow image can't hold it up. */
function imagesReady() {
  const imgs = [...document.querySelectorAll('#app img')].filter(i => i.src && !i.complete);
  const bg = getComputedStyle($('bg')).backgroundImage.match(/url\("?([^")]+)"?\)/);
  const waits = imgs.map(i => new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }));
  if (bg) waits.push(new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = bg[1]; }));
  if (document.fonts) waits.push(document.fonts.ready);
  return Promise.race([Promise.all(waits), new Promise(r => setTimeout(r, 6000))]);
}

async function hideSplash() {
  await imagesReady();
  const wait = 900 - (Date.now() - splashStart);   // long enough to see it, never a flash
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  clearInterval(splashTimer);
  $('splash').classList.add('gone');
  setTimeout(() => { $('splash').remove(); document.dispatchEvent(new Event('splash-gone')); }, 600);
}

async function start() {
  for (const b of document.querySelectorAll('.win button')) b.onclick = () => cs.window(b.dataset.w);
  let d;
  try { d = await cs.init(); } catch (e) { $('splashText').textContent = "Couldn't start: " + e.message; clearInterval(splashTimer); return; }
  S = { ...S, ...d };
  $('ver').textContent = 'v' + d.version + (d.offline ? ' · offline' : '');
  $('discord').onclick = () => cs.link(d.links.discord);
  // the current sport's own website (Crafted Premier -> craftedpremier.com, hockey -> craftedhockey.com)
  const SITE_OF = { soccer: 'https://craftedpremier.com', hockey: 'https://craftedhockey.com' };
  $('website').onclick = () => cs.link(inst()?.website || SITE_OF[S.current] || d.links.website);
  renderAccount();
  renderRail();
  const first = S.instances.find(i => i.id === S.global.lastInstance && i.status !== 'soon') || S.instances.find(i => i.status !== 'soon') || S.instances[0];
  if (first) select(first.id);
  renderNews();
  await hideSplash();
  // (the sign-in prompt, if needed, comes once the background sign-in check reports back)
  // refresh the instances now and then (new version published)
  setInterval(async () => { if (S.busy || S.running) return; const r = await cs.refresh(); S.instances = r.instances; renderRail(); renderHero(); }, 10 * 60 * 1000);
}

// ── account ─────────────────────────────────────────────────────────────

function renderAccount() {
  const a = $('account');
  a.innerHTML = '';
  if (S.account) {
    const img = el('img');
    img.src = `https://mc-heads.net/avatar/${S.account.uuid}/60`;
    img.onerror = () => { img.style.visibility = 'hidden'; };
    a.append(img, el('div', 'who', `<b>${esc(S.account.name)}</b><span>Signed in</span>`));
  } else {
    const b = el('button', 'signbtn', 'Sign in');
    b.onclick = showSignIn;
    a.append(b, el('div', 'who', `<b>Not signed in</b><span>Sign in with Microsoft to play</span>`));
  }
}

function showSignIn() {
  $('signin').hidden = false;
  $('signinError').hidden = true;
  if (!S.signInReady) {
    $('signinError').textContent = "Sign-in isn't set up in this build yet (no Microsoft app ID).";
    $('signinError').hidden = false;
  }
}

$('msLogin').onclick = async () => {
  $('msLogin').disabled = true;
  $('signinError').hidden = true;
  const r = await cs.login();
  $('msLogin').disabled = false;
  if (r.ok) {
    S.account = r.account;
    $('signin').hidden = true;
    renderAccount();
  } else {
    $('signinError').textContent = /403|refused/.test(r.error)
      ? "Microsoft refused the sign-in (403). Make sure this Microsoft account owns Minecraft: Java Edition, then try again."
      : r.error;
    $('signinError').hidden = false;
  }
};
// The old "Play through the Minecraft Launcher instead" button is gone: everyone plays through this launcher now.
if ($('skipSignin')) $('skipSignin').hidden = true;
$('signin').onclick = e => { if (e.target === $('signin')) $('signin').hidden = true; };

// ── sports ──────────────────────────────────────────────────────────────

function renderRail() {
  const rail = $('rail');
  rail.innerHTML = '';
  for (const i of S.instances) {
    const b = el('button', 'sport' + (i.status === 'soon' ? ' soon' : '') + (i.theme.logoPlate ? ' plate' : '') + (S.current === i.id ? ' on' : ''));
    b.style.setProperty('--c', i.theme.accent || '#fff');
    const img = el('img');
    img.src = i.theme.logo || '../assets/icon.png';
    b.append(img, el('span', 'tip', esc(i.short || i.name.replace(/^Crafted\s+/i, '')) + (i.status === 'soon' ? ' · soon' : '')));
    b.title = i.name + (i.status === 'soon' ? ' - coming soon' : '');
    b.onclick = () => select(i.id);
    rail.append(b);
  }
}

function inst() {
  return S.instances.find(i => i.id === S.current);
}

function select(id) {
  if (S.busy) return;
  S.current = id;
  renderRail();
  renderHero();
  loadLeague();
  if ($('stage').dataset.view === 'profile') openProfile();
  if ($('stage').dataset.view === 'web') { WEB.site = siteFor(id) || WEB.site; syncSite(true); }
}

function applyTheme(i) {
  const r = document.documentElement.style;
  r.setProperty('--accent', S.global.accent || i.theme.accent || '#00ff85');
  r.setProperty('--accent2', i.theme.accent2 || '#ff2882');
  r.setProperty('--dark', i.theme.dark || '#12141c');
  const bg = $('bg');
  bg.className = 'bg';
  bg.style.backgroundImage = '';
  const choice = S.global.background || '';
  if (choice === 'dark' || choice === 'stadium') bg.classList.add(choice);
  else if (i.theme.background) { bg.classList.add('image'); bg.style.backgroundImage = `linear-gradient(90deg, rgba(7,8,12,.8), rgba(7,8,12,.25)), url("${i.theme.background}")`; }
}

function renderHero() {
  const i = inst();
  if (!i) return;
  applyTheme(i);
  const hero = document.querySelector('.hero');
  hero.style.animation = 'none'; void hero.offsetWidth; hero.style.animation = '';
  $('crest').className = 'crest' + (i.theme.logoPlate ? ' plate' : '');
  $('crest').querySelector('img').src = i.theme.logo || '../assets/icon.png';
  $('tagline').textContent = i.tagline;
  $('bignum').textContent = i.season ? i.season.number : '';
  $('name').textContent = i.name;
  const meta = [];
  if (i.status === 'soon') meta.push('Coming soon');
  else {
    if (i.season) meta.push(`<span class="season">${esc(i.season.label || 'Season ' + i.season.number)}</span>`);
    if (i.server?.name) meta.push(`<span><i class="dot"></i>${esc(i.server.name)}</span>`);
    meta.push(`<span>Minecraft ${esc(i.minecraft)}</span>`);
    meta.push(`<span>${i.installedVersion ? (i.installedVersion === i.version ? 'Up to date' : 'Update ready') : 'Not installed yet'}</span>`);
  }
  $('meta').innerHTML = meta.join('');
  updatePlay();
  $('error').hidden = true;
}

function updatePlay() {
  const i = inst();
  const p = $('play');
  if (!i) return;
  const soon = i.status === 'soon';
  p.disabled = soon || S.busy || S.running;
  p.querySelector('.label').textContent = soon ? 'SOON' : S.running ? 'PLAYING' : S.busy ? 'GETTING READY' : 'PLAY';
  $('playSub').textContent = soon ? 'Not out yet' : S.running ? 'Game is running' : !i.installedVersion ? 'Installs the first time' : i.installedVersion !== i.version ? 'Updates first'
    : !S.account ? 'Sign in to play' : (i.settings.autoJoin && i.server?.address ? 'Straight into the server' : 'Ready');
  $('openSettings').disabled = soon;
  $('openFolder').disabled = soon;
  const c = $('cancelPlay');
  c.hidden = !(S.busy || S.running);
  if (!S.cancelling && !S.confirmStop) { c.disabled = false; c.textContent = S.running ? 'Close game' : 'Cancel'; }
}

// Cancel while getting ready; once the game is up, "Close game" (press twice) ends it.
$('cancelPlay').onclick = async () => {
  const c = $('cancelPlay');
  if (S.busy) {
    S.cancelling = true;
    c.disabled = true;
    c.textContent = 'Cancelling...';
    await cs.cancelPlay();
  } else if (S.running) {
    if (!S.confirmStop) {
      S.confirmStop = true;
      c.textContent = 'Click again to close';
      c.classList.add('confirm');
      setTimeout(() => { if (S.confirmStop) { S.confirmStop = false; c.classList.remove('confirm'); updatePlay(); } }, 3000);
      return;
    }
    S.confirmStop = false;
    c.classList.remove('confirm');
    c.disabled = true;
    c.textContent = 'Closing...';
    await cs.stopGame();
  }
};

$('play').onclick = async () => {
  const i = inst();
  if (!i || S.busy || S.running) return;
  // Always play through this launcher: never hand over to the vanilla Minecraft Launcher. If the saved sign-in is
  // still being checked (Play pressed right after opening), wait for it; if there's no sign-in, ask for one.
  if (!S.account && !S.accountChecked) {
    $('playSub').textContent = 'Signing in...';
    await new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => { if (S.account || S.accountChecked || Date.now() - t0 > 10000) { clearInterval(iv); res(); } }, 150); });
    updatePlay();
  }
  if (!S.account) { showSignIn(); return; }
  S.busy = true;
  $('error').hidden = true;
  updatePlay();
  const r = await cs.play(i.id);
  S.busy = false;
  S.cancelling = false;
  if (r.cancelled) {
    // nothing to report - the next Play carries on where the downloads stopped
  } else if (!r.ok) {
    $('error').textContent = r.error;
    $('error').hidden = false;
    if (r.signIn) showSignIn();
  } else {
    i.installedVersion = i.version;
    if (r.via === 'launcher') {
      $('error').className = 'error info';
      $('error').innerHTML = `<b>The Minecraft Launcher is opening</b> with <b>${esc(r.name)}</b> selected - press its Play button. Mods, packs and the server are all set up.`;
      $('error').hidden = false;
      setTimeout(() => { $('error').hidden = true; $('error').className = 'error'; }, 20000);
    }
  }
  updatePlay();
};

cs.on('account', acct => {
  S.accountChecked = true;
  if (acct) { S.account = acct; S.profile = null; renderAccount(); updatePlay(); if (!$('profile').hidden) openProfile(); }
  else if (!S.account) showSignIn();
});
cs.on('instances', r => { if (S.busy || S.running) return; S.instances = r.list; $('ver').textContent = 'v' + S.version + (r.offline ? ' · offline' : ''); renderRail(); renderHero(); });
cs.on('progress', p => {
  if (!p) { $('progress').hidden = true; return; }
  $('progress').hidden = false;
  const pct = p.total ? Math.round(100 * p.done / p.total) : 0;
  $('bar').style.width = pct + '%';
  $('ptext').textContent = p.stage + (p.total > 1 ? ` · ${p.done} / ${p.total}` : '');
});

cs.on('game', g => {
  S.running = g.state === 'running';
  if (!S.running) S.confirmStop = false;
  if (g.state === 'stopped' && !g.byUser && g.code && g.code !== 0) {
    $('error').innerHTML = `The game closed with an error (code ${esc(g.code)}). <a href="#" id="seeLogs">Open the logs</a>`;
    $('error').hidden = false;
    $('seeLogs').onclick = e => { e.preventDefault(); cs.logs(S.current); };
  }
  renderHero();
});

// the game crashed: offer to send the crash report (or say it was sent automatically)
cs.on('crash', c => {
  const box = $('error');
  box.className = 'error';
  box.hidden = false;
  if (c.sent) {
    box.innerHTML = `The game crashed <span class="muted">(${esc(c.signature)})</span>. A crash report was sent - thanks! <a href="#" id="seeLogs">Open the logs</a>`;
    $('seeLogs').onclick = e => { e.preventDefault(); cs.logs(S.current); };
    return;
  }
  box.innerHTML = `<b>The game crashed.</b> <span class="muted">${esc(c.signature)}</span><br>
    Send us the crash report so we can fix it? It includes your game logs and mod list (no passwords).<br>
    <input id="crashNote" maxlength="300" placeholder="What were you doing? (optional)" style="width:100%;margin:6px 0">
    <button class="small" id="crashSend">Send crash report</button>
    <label class="check" style="display:inline-flex;margin-left:8px"><input type="checkbox" id="crashAlways"><span>Always send</span></label>
    <a href="#" id="seeLogs" style="margin-left:8px">Open the logs</a> · <a href="#" id="crashNo">No thanks</a>`;
  $('seeLogs').onclick = e => { e.preventDefault(); cs.logs(S.current); };
  $('crashNo').onclick = e => { e.preventDefault(); cs.dismissCrash(); box.hidden = true; };
  $('crashSend').onclick = async () => {
    $('crashSend').disabled = true;
    $('crashSend').textContent = 'Sending...';
    if ($('crashAlways').checked) S.global = await cs.globalSettings({ autoCrashReports: true });
    const r = await cs.sendCrash($('crashNote').value.trim());
    box.innerHTML = r.ok ? 'Crash report sent - thanks! We\'ll look into it.' : `Couldn't send the report: ${esc(r.error)}`;
    if (r.ok) setTimeout(() => { box.hidden = true; }, 8000);
  };
});

cs.on('update', u => {
  const b = $('update');
  b.hidden = false;
  b.classList.toggle('ready', u.state === 'ready');
  b.textContent = u.state === 'ready' ? `Update ${u.version} ready - restart` : `Downloading update${u.percent != null ? ' ' + u.percent + '%' : ''}`;
  b.onclick = u.state === 'ready' ? () => cs.installUpdate() : null;
});

function renderNews() {
  const n = $('news');
  n.innerHTML = '';
  const items = S.news || [];
  if (!items.length) return;
  n.append(el('h4', null, 'News'));
  for (const x of items.slice(0, 4)) {
    const c = el('div', 'note', `<b>${esc(x.title)}</b><p>${esc(x.body)}</p>${x.date ? `<small>${esc(x.date)}</small>` : ''}`);
    if (x.url) { c.style.cursor = 'pointer'; c.onclick = () => cs.link(x.url); }
    n.append(c);
  }
}

$('openFolder').onclick = () => cs.open(S.current, '');

// ── settings ────────────────────────────────────────────────────────────

$('openSettings').onclick = openSettings;
$('closeSettings').onclick = () => { $('settings').hidden = true; renderHero(); };
$('settings').onclick = e => { if (e.target === $('settings')) $('closeSettings').onclick(); };
for (const t of document.querySelectorAll('.tabs button')) t.onclick = () => tab(t.dataset.tab);

function tab(name) {
  for (const t of document.querySelectorAll('.tabs button')) t.classList.toggle('on', t.dataset.tab === name);
  for (const p of document.querySelectorAll('.tab')) p.hidden = p.dataset.tab !== name;
  if (name === 'mods') listFiles('mods', 'modList');
  if (name === 'packs') { listFiles('resourcepacks', 'packList'); listFiles('shaderpacks', 'shaderList'); }
}

function openSettings() {
  const i = inst();
  if (!i || i.status === 'soon') return;
  const s = i.settings;
  $('setTitle').textContent = i.name;
  const max = Math.max(4096, Math.floor((S.totalMemory || 8192) * 0.75 / 512) * 512);
  $('mem').max = max;
  $('mem').value = s.memory;
  $('memVal').textContent = (s.memory / 1024).toFixed(1) + ' GB';
  $('width').value = s.width;
  $('height').value = s.height;
  $('fullscreen').checked = s.fullscreen;
  $('autoJoin').checked = s.autoJoin;
  $('javaArgs').value = s.javaArgs;
  // optional mods, by group (Optimization mods...), each with a switch-all
  const opt = $('optional');
  opt.innerHTML = '';
  const groups = {};
  for (const o of i.optional) (groups[o.group] = groups[o.group] || []).push(o);
  for (const [g, items] of Object.entries(groups)) {
    const head = el('div', 'ghead');
    const all = el('input');
    all.type = 'checkbox';
    all.checked = items.every(o => !s.disabled.includes(o.path));
    all.indeterminate = !all.checked && items.some(o => !s.disabled.includes(o.path));
    all.onchange = async () => {
      const set = new Set(s.disabled);
      for (const o of items) all.checked ? set.delete(o.path) : set.add(o.path);
      await saveInstance({ disabled: [...set] });
      openSettings();
    };
    const lab = el('label', null, `<h3>${esc(g)}</h3>`);
    lab.prepend(all);
    head.append(lab, el('span', 'count', `${items.filter(o => !s.disabled.includes(o.path)).length} / ${items.length} on`));
    opt.append(head);
    const box = el('div', 'gbox');
    for (const o of items) {
      const row = el('label', 'opt', `<div><b>${esc(o.label)}</b>${o.description ? `<small>${esc(o.description)}</small>` : ''}</div>`);
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = !s.disabled.includes(o.path);
      cb.onchange = async () => {
        const set = new Set(s.disabled);
        cb.checked ? set.delete(o.path) : set.add(o.path);
        await saveInstance({ disabled: [...set] });
        openSettings();
      };
      row.prepend(cb);
      box.append(row);
    }
    opt.append(box);
  }
  // launcher look
  const sw = $('swatches');
  sw.innerHTML = '';
  for (const c of SWATCHES) {
    const b = el('button', (S.global.accent || '') === c ? 'on' : '');
    b.style.background = c || `linear-gradient(135deg, ${i.theme.accent} 50%, ${i.theme.accent2 || i.theme.accent} 50%)`;
    b.title = c ? c : "The sport's own colour";
    b.onclick = async () => { S.global = await cs.globalSettings({ accent: c }); openSettings(); renderHero(); };
    sw.append(b);
  }
  for (const b of $('bgchoice').children) {
    b.classList.toggle('on', (S.global.background || '') === b.dataset.bg);
    b.onclick = async () => { S.global = await cs.globalSettings({ background: b.dataset.bg }); openSettings(); renderHero(); };
  }
  $('closeOnLaunch').checked = S.global.closeOnLaunch !== false;
  $('autoCrash').checked = !!S.global.autoCrashReports;
  $('settings').hidden = false;
}

async function saveInstance(patch) {
  const i = inst();
  i.settings = await cs.instanceSettings(i.id, patch);
}

$('mem').oninput = () => { $('memVal').textContent = ($('mem').value / 1024).toFixed(1) + ' GB'; };
$('mem').onchange = () => saveInstance({ memory: +$('mem').value });
$('width').onchange = () => saveInstance({ width: Math.max(640, +$('width').value || 1280) });
$('height').onchange = () => saveInstance({ height: Math.max(480, +$('height').value || 720) });
$('fullscreen').onchange = () => saveInstance({ fullscreen: $('fullscreen').checked });
$('autoJoin').onchange = () => saveInstance({ autoJoin: $('autoJoin').checked });
$('javaArgs').onchange = () => saveInstance({ javaArgs: $('javaArgs').value.trim() });
$('closeOnLaunch').onchange = async () => { S.global = await cs.globalSettings({ closeOnLaunch: $('closeOnLaunch').checked }); };
$('autoCrash').onchange = async () => { S.global = await cs.globalSettings({ autoCrashReports: $('autoCrash').checked }); };
$('openLogs').onclick = () => cs.logs(S.current);
$('logout').onclick = async () => { await cs.logout(); S.account = null; renderAccount(); $('settings').hidden = true; showSignIn(); };

for (const [btn, sub, list] of [['addMods', 'mods', 'modList'], ['addPacks', 'resourcepacks', 'packList'], ['addShaders', 'shaderpacks', 'shaderList']])
  $(btn).onclick = async () => { await cs.addFiles(S.current, sub); listFiles(sub, list); };
for (const [btn, sub] of [['openMods', 'mods'], ['openPacks', 'resourcepacks'], ['openShaders', 'shaderpacks']])
  $(btn).onclick = () => cs.open(S.current, sub);

async function listFiles(sub, listId) {
  const ul = $(listId);
  const files = await cs.listFiles(S.current, sub);
  ul.innerHTML = '';
  if (!files.length) { ul.append(el('li', 'empty', 'Nothing here yet')); return; }
  files.sort((a, b) => (b.managed - a.managed) || a.name.localeCompare(b.name));
  for (const f of files) {
    const li = el('li', null, `<span class="n" title="${esc(f.name)}">${esc(f.name)}</span>`);
    if (f.managed) li.append(el('span', 'lock', 'League'));
    else {
      const rm = el('button', null, 'Remove');
      rm.onclick = async () => { await cs.removeFile(S.current, sub, f.name); listFiles(sub, listId); };
      li.append(rm);
    }
    ul.append(li);
  }
}

start();


// ── profile + store ─────────────────────────────────────────────────────

const GEAR = [
  ['stick', 'Stick'], ['glove', 'Goalie glove'], ['goalieMask', 'Goalie mask'], ['goaliePads', 'Goalie pads'],
  ['helmetGear', 'Helmet gear'], ['celebration', 'Celebration'], ['explosion', 'Goal explosion'], ['trail', 'Puck trail'],
];
const pretty = v => String(v ?? '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
let viewer = null, skinImg = null, kitState = { team: null, variant: 'home' };

function showView(v) {
  document.querySelector('#stage').dataset.view = v;
  for (const b of document.querySelectorAll('#views button')) b.classList.toggle('on', b.dataset.view === v);
  $('profile').hidden = v !== 'profile';
  $('store').hidden = v !== 'store';
  $('league').hidden = v !== 'league';
  $('web').hidden = v !== 'web';
  if (v === 'league') renderLeague();
  syncSite();
  if (v === 'profile') openProfile();
  if (v === 'store') openStore();
}
for (const b of document.querySelectorAll('#views button')) b.onclick = () => showView(b.dataset.view);
$('toStore').onclick = () => showView('store');

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

/** Paints the whole uniform onto the skin's outer layers at 8x: helmet, jersey + sleeves, socks and boots. */
async function composeSkin(skinSrc, kit, slim) {
  const K = 8, base = await loadImage(skinSrc);
  const c = document.createElement('canvas'); c.width = 64 * K; c.height = 64 * K;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(base, 0, 0, base.width, base.height, 0, 0, c.width, base.height * (c.width / base.width));
  if (!kit?.data || base.height !== base.width || window.ChaArmour) return c;   // the armour is drawn as boxes (armour.js), the skin stays the player's own
  const j = await loadImage(kit.data), S = j.width / 64;       // jersey texture is the armour layer at S px per skin pixel
  const sk = kit.socks ? await loadImage(kit.socks) : null, SS = sk ? sk.height / 32 : 1;
  // copy a block of an armour texture onto the skin's outer layer (optionally mirrored)
  const cp = (img, sc, sx, sy, sw, sh, dx, dy, dw = sw, flip = false) => {
    g.save();
    if (flip) { g.translate((dx + dw) * K, dy * K); g.scale(-1, 1); g.drawImage(img, sx * sc, sy * sc, sw * sc, sh * sc, 0, 0, dw * K, sh * K); }
    else g.drawImage(img, sx * sc, sy * sc, sw * sc, sh * sc, dx * K, dy * K, dw * K, sh * K);
    g.restore();
  };
  // a limb: faces side(4) front(fw) side(4) back(fw) with caps above; src is the armour layout's limb origin
  const limb = (img, sc, ox, oy, dx, dy, mirror, fw, clear) => {
    if (clear) g.clearRect(dx * K, dy * K, (8 + 2 * fw) * K, 16 * K);
    const f = mirror
      ? [[8, 4, dx, 4], [4, 4, dx + 4, fw], [0, 4, dx + 4 + fw, 4], [12, 4, dx + 8 + fw, fw]]
      : [[0, 4, dx, 4], [4, 4, dx + 4, fw], [8, 4, dx + 4 + fw, 4], [12, 4, dx + 8 + fw, fw]];
    for (const [fx, sw, ddx, dw] of f) cp(img, sc, ox + fx, oy + 4, sw, 12, ddx, dy + 4, dw, mirror);
    cp(img, sc, ox + 4, oy, 4, 4, dx + 4, dy, fw, mirror); cp(img, sc, ox + 8, oy, 4, 4, dx + 4 + fw, dy, fw, mirror);
  };
  const fw = slim ? 3 : 4;
  // helmet: the head block of the armour texture over the hat layer (32,0)
  if (kit.sport !== 'soccer') g.clearRect(32 * K, 0, 32 * K, 16 * K);   // the CHA helmet model replaces the flat hat layer (see helmet.js)
  // jersey: body -> jacket layer, arms -> sleeves
  g.clearRect(16 * K, 32 * K, 24 * K, 16 * K); cp(j, S, 16, 16, 24, 16, 16, 32);
  limb(j, S, 40, 16, 40, 32, false, fw, true); limb(j, S, 40, 16, 48, 48, true, fw, true);
  // legs: socks first, the boots of the jersey texture over them
  if (sk) { limb(sk, SS, 0, 16, 0, 32, false, 4, true); limb(sk, SS, 0, 16, 0, 48, true, 4, true); }
  else { g.clearRect(0, 32 * K, 16 * K, 16 * K); g.clearRect(0, 48 * K, 16 * K, 16 * K); }
  limb(j, S, 0, 16, 0, 32, false, 4, false); limb(j, S, 0, 16, 0, 48, true, 4, false);
  if (kit.shorts) {                                          // football shorts: the leggings layer over the waist and upper legs
    const sh = await loadImage(kit.shorts), SH = sh.width / 64;
    cp(sh, SH, 16, 16, 24, 16, 16, 32);
    limb(sh, SH, 0, 16, 0, 32, false, 4, false); limb(sh, SH, 0, 16, 0, 48, true, 4, false);
  }
  return c;
}

// Every change to the 3D model runs one at a time, newest wins: switching sport mid-build can't leave the old
// sport's armour, helmet, pads or ball behind, and a burst of clicks only builds the last one.
let lookChain = Promise.resolve(), lookGen = 0;
function serialLook(fn, keep) {
  const g = keep ? lookGen : ++lookGen;
  lookChain = lookChain.then(() => (keep || g === lookGen ? fn() : null)).catch(e => console.warn('locker', e));
  return lookChain;
}
const showSkin = (profile, kit) => serialLook(() => showSkinNow(profile, kit));
const refreshLook = () => serialLook(() => refreshLookNow());
const lookRebuild = fn => serialLook(fn, true);   // a picked item: always applied, in order

/** Takes every sport's extras off the model (before dressing it for the other sport). */
function stripLook() {
  if (!viewer) return;
  for (const k of ['_helmet', '_mask']) if (viewer[k]) { viewer[k].parent?.remove(viewer[k]); viewer[k] = null; }
  try { window.ChaGear && ChaGear.build(viewer, null, {}); } catch {}
  try { window.ChaRig && ChaRig.reset(viewer); } catch {}
  if (viewer._soccer && window.SoccerLocker) { try { SoccerLocker.clear(viewer); } catch {} viewer._soccer = null; socState.looped = null; }
  viewer.playerWrapper.rotation.y = 0;
}

async function showSkinNow(profile, kit) {
  if (!window.skinview3d) return;
  const canvas = $('skinCanvas');
  if (!viewer) {
    viewer = new skinview3d.SkinViewer({ canvas, width: 340, height: 380, zoom: 0.85 });
    viewer.fov = 30;
    viewer.animation = new skinview3d.WalkingAnimation(); viewer.animation.speed = 0.7;
    viewer.autoRotate = false;
  }
  const src = profile.skin || '../assets/sports/steve.png';
  const cvs = await composeSkin(src, kit, profile.slim);
  await viewer.loadSkin(cvs, { model: profile.slim ? 'slim' : 'default' });
  viewer._kit = kit; viewer._profile = profile;
  await refreshLookNow();   // (the kit itself goes on in rebuildJersey)
}

// ── Locker: try on cosmetics on the CHA rig (same stance, pads, glove, blocker and stick as the CHA Client) ──
const tryState = { stance: 'skater', rig: true, gear: 'none', stick: 'auto', mask: 'canada', pads: 'default', glove: 'black', blocker: true, fx: {}, tab: 'Helmet' };
const GEAR_OPTS = ['none', 'visor_clear', 'visor_smoke', 'visor_mirror', 'visor_blue', 'visor_purple', 'visor_red', 'visor_orange', 'visor_amber', 'visor_green', 'visor_pink',
  'fishbowl_clear', 'fishbowl_smoke', 'fishbowl_mirror', 'fishbowl_blue', 'cage_black', 'cage_white', 'cage_chrome'];
const SKATER_STICKS = ['aurora', 'birdo', 'bone', 'bronze', 'browncow', 'canada', 'chameleon', 'chicken', 'circuit', 'cow', 'crafted_gold', 'czech', 'darkmatter', 'ember', 'festive', 'finland', 'flower', 'frostbite', 'geekbob', 'germany', 'gold', 'lightning', 'mauer', 'mherwood', 'pumpkin', 'pumpkin_purple', 'pumpkin_red', 'retro', 'russia', 'scythe', 'silver', 'slime', 'sweden', 'swiss', 'usa', 'winter', 'witchbroom'];
const GOALIE_STICKS = ['aurora', 'bone', 'browncow', 'canada', 'circuit', 'cow', 'crafted_gold', 'czech', 'ember', 'finland', 'frostbite', 'germany', 'lightning', 'mauer', 'mherwood', 'pumpkin', 'pumpkin_purple', 'pumpkin_red', 'retro', 'russia', 'slime', 'sweden', 'swiss', 'usa', 'witchbroom'];
const GLOVES = ['black', 'white', 'red', 'dark_red', 'maroon', 'orange', 'yellow', 'gold', 'lime', 'green', 'cyan', 'light_blue', 'blue', 'indigo', 'violet', 'magenta', 'pink', 'dark_tan', 'vintage', 'cancer', 'mother', 'father', 'puck'];
const PADS = ['default', 'retro', 'pass_aurora', 'pass_circuit', 'pass_crafted_gold', 'pass_ember', 'pass_glacier', 'color_black', 'color_blue', 'color_brown', 'color_cyan', 'color_gray', 'color_green', 'color_light_blue', 'color_light_gray', 'color_lime', 'color_magenta', 'color_orange', 'color_pink', 'color_purple', 'color_red', 'color_yellow'];
const FX_CATS = { Celebration: 'Celebrations', Explosion: 'Goal Explosions', Trail: 'Puck Trails' };
const stickList = () => tryState.stance === 'goalie' ? GOALIE_STICKS : SKATER_STICKS;
const stickName = () => tryState.stick === 'auto' || !stickList().includes(tryState.stick) ? 'mherwood' : tryState.stick;

async function rebuildHelmet() {
  if (!viewer) return;
  const head = viewer.playerObject.skin.head;
  if (viewer._helmet) { head.remove(viewer._helmet); viewer._helmet = null; }
  const k = viewer._kit;
  if (k?.data && k.sport !== 'soccer' && lockerSport !== 'soccer' && window.ChaHelmet && tryState.stance !== 'goalie') {
    try { viewer._helmet = await ChaHelmet.build(viewer, k.data, tryState.gear, { mirrorSrc: '../assets/chaclient/mirror_visor.png' }); head.add(viewer._helmet); } catch (e) { console.warn('helmet', e); }
  }
}
async function rebuildMask() {
  if (!viewer) return;
  const head = viewer.playerObject.skin.head;
  if (viewer._mask) { head.remove(viewer._mask); viewer._mask = null; }
  if (tryState.stance !== 'goalie' || !tryState.rig || !window.ChaMask || !tryState.mask) return;
  try { viewer._mask = await ChaMask.build(viewer, tryState.mask); if (viewer._mask) head.add(viewer._mask); } catch (e) { console.warn('mask', e); }
}
/** The jersey: armour boxes over the skin, same layers as the CHA Client. */
async function rebuildJersey() {
  if (!viewer || !window.ChaArmour) return;
  const k = viewer._kit;
  let layers = [];
  try {
    if (k?.cpl) layers = await ChaArmour.cplLayers(k.cpl, { number: k.number, digits: window.CPL_KITS?.digits?.includes(k.cplKey.split('_')[0]) ? `../assets/kits/cpl/digits_${k.cplKey.split('_')[0]}.png` : '../assets/kits/cpl/digits.png', colours: window.CPL_KITS?.colours?.[k.cplKey] });
    else if (k?.data) {
      layers.push({ src: k.data, grow: 1, parts: ['body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] });
      if (k.socks) layers.unshift({ src: k.socks, grow: .5, parts: ['leftLeg', 'rightLeg'] });
      if (k.shorts) layers.unshift({ src: k.shorts, grow: .5, parts: ['body', 'leftLeg', 'rightLeg'] });
    }
    await ChaArmour.build(viewer, layers);
  } catch (e) { console.warn('jersey', e); }
}
let rigBusy = null;
/** Poses the model with the rig and puts the stick, pads, glove and blocker on it. */
async function rebuildRig() {
  if (!viewer?.skinTexture || !window.ChaRig) return;
  await ChaRig.load('../assets/chaclient/anims.json');
  const goalie = tryState.stance === 'goalie';
  await ChaGear.build(viewer, null, {});
  if (!tryState.rig) { ChaRig.reset(viewer); viewer.zoom = .85; return; }
  viewer.animation = null; viewer.autoRotate = false;
  for (const b of document.querySelectorAll('.vctl .chip')) b.classList.remove('on');
  viewer.playerObject.resetJoints(); viewer.playerObject.position.set(0, goalie ? 3 : 1, 0); viewer.zoom = goalie ? .72 : .8;
  const st = ChaRig.apply(viewer, { role: goalie ? 'goalie' : 'skater', fitStick: true });
  await ChaGear.build(viewer, st, {
    pads: goalie ? tryState.pads : null, glove: goalie ? tryState.glove : null, blocker: goalie && tryState.blocker,
    stick: `../assets/chaclient/sticks/${goalie ? 'goalie' : 'skater'}/${stickName()}.png`,
  });
}
let lookSport = null;
async function refreshLookNow() {
  if (viewer && lookSport !== lockerSport) { stripLook(); lookSport = lockerSport; }
  if (lockerSport === 'soccer') { await rebuildJersey(); await dressSoccer(); return; }
  if (viewer?._soccer && window.SoccerLocker) { SoccerLocker.clear(viewer); viewer.playerWrapper.rotation.y = 0; }
  await rebuildJersey(); await rebuildHelmet(); await rebuildRig(); await rebuildMask();
}

const TINT = { clear: '#a9d7f2', smoke: '#1d252e', mirror: '#d8e4ec', blue: '#2f6bff', purple: '#8a2be2', red: '#e0303a', orange: '#ff8a1f', amber: '#ffc53a', green: '#2fbf62', pink: '#ff5fb8', black: '#15181c', white: '#f3f4f5', chrome: '#c9d1d8' };
const CH = '../assets/chaclient/';
/** A tile picture cut from a model texture: the biggest front (north) face of the model. */
const thumbCache = new Map();
function faceThumb(src, elements) {
  const key = src; if (thumbCache.has(key)) return thumbCache.get(key);
  let best = null, area = 0;
  for (const e of elements || []) { const q = e.faces?.north?.uv; if (!q) continue; const a = Math.abs((q[2] - q[0]) * (q[3] - q[1])); if (a > area) { area = a; best = q; } }
  const p = loadImage(src).then(img => {
    if (!best) return src;
    const k = img.width / 16, x = Math.min(best[0], best[2]) * k, y = Math.min(best[1], best[3]) * k, w = Math.abs(best[2] - best[0]) * k, h = Math.abs(best[3] - best[1]) * k;
    const c = document.createElement('canvas'), s = 96 / Math.max(w, h); c.width = Math.round(w * s); c.height = Math.round(h * s);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }).catch(() => src);
  thumbCache.set(key, p); p.then(v => thumbCache.set(key, v));
  return p;
}
let thumbRedraw = null;
const thumbNow = (src, els) => {
  const v = thumbCache.get(src); if (typeof v === 'string') return v;
  if (!v) faceThumb(src, els).then(() => { clearTimeout(thumbRedraw); thumbRedraw = setTimeout(renderLab, 30); });   // one redraw once they're cut
  return null;
};

function labItems(tab) {
  const goalie = tryState.stance === 'goalie';
  if (tab === 'Helmet') return GEAR_OPTS.map(g => ({ id: g, label: g === 'none' ? 'No face gear' : pretty(g), sub: g === 'none' ? '' : pretty(g.split('_')[0]), color: TINT[g.split('_')[1]] || null, on: tryState.gear === g, set: async () => { tryState.gear = g; await rebuildHelmet(); } }));
  if (tab === 'Stick') return stickList().map(g => ({ id: g, label: pretty(g), img: `${CH}sticks/${goalie ? 'goalie' : 'skater'}/${g}.png`, art: 'stick', on: stickName() === g, set: async () => { tryState.stick = g; await rebuildRig(); } }));
  if (tab === 'Mask') return (window.ChaMask ? ChaMask.keys() : []).map(g => ({ id: g, label: pretty(g) + ' mask', img: thumbNow(`../assets/cosmetics/masks/${window.CHA_MASKS[g].texture}`, window.CHA_MASKS[g].elements), on: tryState.mask === g, set: async () => { tryState.mask = g; await rebuildMask(); } }));
  if (tab === 'Pads') return PADS.map(g => ({ id: g, label: pretty(g.replace('pass_', 'pass ').replace('color_', '')), img: window.CHA_PADS?.[g] ? thumbNow(`${CH}pads/${g}.png`, [window.CHA_PADS[g].els[0]]) : null, art: 'pad', on: tryState.pads === g, set: async () => { tryState.pads = g; await rebuildRig(); } }));
  if (tab === 'Glove') return GLOVES.map(g => ({ id: g, label: pretty(g), img: `${CH}gloves/${g}.png`, on: tryState.glove === g, set: async () => { tryState.glove = g; await rebuildRig(); } }));
  if (tab === 'Blocker') return [{ id: 'mauer', label: 'Blocker', img: `${CH}blockers/mauer.png`, on: tryState.blocker, set: async () => { tryState.blocker = true; await rebuildRig(); } },
    { id: 'none', label: 'No blocker', on: !tryState.blocker, set: async () => { tryState.blocker = false; await rebuildRig(); } }];
  if (FX_CATS[tab]) {
    const items = (catalog || []).filter(i => i.cat === FX_CATS[tab]);
    return items.map(i => ({ id: i.id, label: i.name, img: i.img, sub: 'Plays in game', on: tryState.fx[tab] === i.id, set: async () => { tryState.fx[tab] = tryState.fx[tab] === i.id ? null : i.id; } }));
  }
  return [];
}
function labTabList() { return tryState.stance === 'goalie' ? ['Mask', 'Pads', 'Glove', 'Blocker', 'Stick', 'Celebration', 'Explosion', 'Trail'] : ['Helmet', 'Stick', 'Celebration', 'Explosion', 'Trail']; }
function renderLab() {
  if (lockerSport === 'soccer') return renderSoccerLab();
  $('labHint').hidden = true; $('labSw').hidden = true; $('labAct').innerHTML = '';
  const tabs = labTabList();
  if (!tabs.includes(tryState.tab)) tryState.tab = tabs[0];
  $('labTabs').innerHTML = '';
  for (const t of tabs) { const b = el('button', 'chip' + (t === tryState.tab ? ' on' : ''), t); b.onclick = () => { tryState.tab = t; renderLab(); }; $('labTabs').append(b); }
  $('labTiles').innerHTML = '';
  for (const it of labItems(tryState.tab)) {
    const t = el('button', 'tile' + (it.on ? ' on' : ''));
    t.innerHTML = `<div class="tart ${it.art || ''}">${it.img ? `<img src="${esc(it.img)}" alt="">` : `<i style="background:${it.color || 'transparent'}"></i>`}</div><div class="tnm">${esc(it.label)}</div>${it.sub ? `<div class="tsub">${esc(it.sub)}</div>` : ''}`;
    t.onclick = async () => { await lookRebuild(() => it.set()); renderLab(); };
    $('labTiles').append(t);
  }
  if (FX_CATS[tryState.tab] && !catalog) cs.catalog().then(c => { catalog = c; renderLab(); }).catch(() => {});
}
$('tryReset').onclick = () => lockerSport === 'soccer' ? setupSoccerTry(S.profile) : setupTry(S.profile);
const norm = v => String(typeof v === 'string' ? v : v?.name || '').toLowerCase().replace(/ /g, '_');
async function setupTry(p) {
  lockerSport = 'hockey'; $('stanceSeg').hidden = false; $('roleSeg').hidden = true;
  const eq = p?.equipped || {};
  tryState.gear = typeof eq.helmetGear === 'string' && GEAR_OPTS.includes(eq.helmetGear) ? eq.helmetGear : 'none';
  const goalie = /^g/i.test(p?.hockey?.position || '');
  tryState.stance = goalie ? 'goalie' : 'skater'; tryState.rig = true;
  const st = norm(eq.stick); tryState.stick = stickList().includes(st) ? st : 'auto';
  const mk = norm(eq.goalieMask).replace('_mask', '');
  tryState.mask = window.CHA_MASKS && CHA_MASKS[mk] ? mk : (ChaMask.keys()[0] || '');
  const gl = norm(eq.glove); tryState.glove = GLOVES.includes(gl) ? gl : 'black';
  const pd = norm(eq.goaliePads); tryState.pads = PADS.find(x => x === pd || x.endsWith('_' + pd)) || 'default';
  tryState.fx = {};
  for (const x of document.querySelectorAll('#tryon [data-stance]')) x.classList.toggle('on', x.dataset.stance === tryState.stance);
  tryState.tab = labTabList()[0];
  renderLab(); if (viewer?.skinTexture) await refreshLook();
}
function setStance(v) {
  tryState.stance = v; tryState.rig = true;
  for (const b of document.querySelectorAll('#tryon [data-stance]')) b.classList.toggle('on', b.dataset.stance === v);
  for (const b of document.querySelectorAll('.vctl .chip')) b.classList.remove('on');
  if (!viewer) return;
  renderLab(); if (viewer?.skinTexture) refreshLook();
}
for (const b of document.querySelectorAll('#tryon [data-stance]')) b.onclick = () => setStance(b.dataset.stance);

for (const b of document.querySelectorAll('.vctl .chip')) b.onclick = () => {
  if (!viewer) return;
  for (const x of document.querySelectorAll('.vctl .chip')) x.classList.toggle('on', x === b);
  tryState.rig = false; for (const x of document.querySelectorAll('#tryon [data-stance]')) x.classList.remove('on');
  ChaGear.build(viewer, null, {}); ChaRig.reset(viewer); rebuildMask();
  viewer.playerObject.resetJoints(); viewer.playerObject.position.set(0, 0, 0);
  viewer.autoRotate = b.dataset.anim === 'spin';
  viewer.animation = b.dataset.anim === 'walk' ? Object.assign(new skinview3d.WalkingAnimation(), { speed: 0.7 }) : b.dataset.anim === 'idle' ? new skinview3d.IdleAnimation() : null;
};

// ── Locker, football: balls, boots, keeper gloves, trails, goal explosions, celebrations and skill moves (soccer-locker.js) ──
let lockerSport = 'hockey';
const SOC_TEAM = { wfc: ['#001830', '#f0f0f0'], blu: ['#d81818', '#d87878'], cfc: ['#1848f0', '#a8c0f0'], stfc: ['#000000', '#f0f0f0'], tm2: ['#a81818', '#d8c0c0'], tm3: ['#007830', '#60a878'], whfc: ['#301818', '#d8c090'], dufc: ['#36a852', '#0e2c1a'], au: ['#1d4fc2', '#f6f7fa'], kob: ['#6b3fc4', '#1a1730'] };
const socState = { tab: 'Ball', ball: 'classic', boots: 'standard', bootColour: null, gloves: 'standard', trail: 'none', explosion: 'classic', busy: false, looped: null };
const SOC_TABS = ['Ball', 'Boots', 'Keeper Gloves', 'Ball Trail', 'Goal Explosion', 'Celebration', 'Skill Moves'];
const SOC_HINTS = {
  'Ball': 'Practice balls from /ball, scrimmage balls (yours on kickoff or after you score) and club team balls.',
  'Boots': 'Club kits come with standard black boots. Pick a boot, then a colourway (colourways are an MVP perk - in game they only show for MVPs).',
  'Keeper Gloves': 'Worn while you\u2019re in goal.',
  'Ball Trail': 'Shows behind your shots in scrimmages and training. Pick one to see a shot.',
  'Goal Explosion': 'Bursts in the net when you score. Pick one to see a goal.',
  'Celebration': 'Plays on the scorer after a goal.',
  'Skill Moves': 'A new look for something you already do - same power, same everything, just style. Uses your ball trail.',
};
const socKeeper = () => kitState.sport === 'soccer' && kitState.variant === 'keeper';
async function setupSoccerTry(p) {
  lockerSport = 'soccer'; $('stanceSeg').hidden = true; $('roleSeg').hidden = false;
  Object.assign(socState, { ball: 'classic', boots: 'standard', bootColour: null, gloves: 'standard', trail: 'none', explosion: 'classic' });
  if (!SOC_TABS.includes(socState.tab)) socState.tab = 'Ball';
  renderSoccerLab(); if (viewer?.skinTexture) await refreshLook();
  loadSocLoadout();
}
// ── what's equipped in game (saved to the player's account; the server uses it) ──
socState.saved = {}; socState.msg = '';
const SOC_SLOT = { Ball: 'ball', Boots: 'boots', 'Keeper Gloves': 'gloves', 'Ball Trail': 'trail', 'Goal Explosion': 'explosion', Celebration: 'celebration' };
const SOC_DEFAULT = { ball: 'classic', boots: 'standard', gloves: 'standard', trail: 'none', explosion: 'classic', celebration: 'fist_pump' };
const socEquipped = slot => socState.saved[slot] || SOC_DEFAULT[slot];
const socSkillOn = id => !String(socState.saved.skills_off || '').split(',').includes(id);
async function loadSocLoadout() {
  const r = await window.cs.lockerGet();
  if (!r.ok) { socState.msg = r.error; renderSoccerLab(); return; }
  socState.saved = r.loadout || {};
  const s = socState.saved;
  Object.assign(socState, { ball: socEquipped('ball'), boots: socEquipped('boots'), gloves: socEquipped('gloves'), trail: socEquipped('trail'),
    explosion: socEquipped('explosion'), celly: socEquipped('celebration'), bootColour: s.boot_colour ? '#' + s.boot_colour : null, msg: '' });
  renderSoccerLab(); if (viewer?.skinTexture && lockerSport === 'soccer') await refreshLook();
}
async function socSave(changes, label) {
  socState.msg = 'Saving...'; renderSoccerLab();
  const r = await window.cs.lockerSet(changes);
  if (!r.ok) { socState.msg = r.error; renderSoccerLab(); return; }
  socState.saved = r.loadout || { ...socState.saved, ...changes };
  socState.msg = label + ' - shows in game next time you join (or within a minute if you\u2019re on). Items you don\u2019t own stay locked in game.';
  renderSoccerLab();
}
async function dressSoccer() {
  if (!viewer?.skinTexture || !window.SoccerLocker) return;
  const L = SoccerLocker;
  ChaGear.build(viewer, null, {}); ChaRig.reset(viewer);
  for (const k of ['_helmet', '_mask']) if (viewer[k]) { viewer[k].parent?.remove(viewer[k]); viewer[k] = null; }
  viewer.playerObject.resetJoints(); viewer.playerObject.position.set(0, 0, 0); viewer.autoRotate = false;
  viewer.playerWrapper.rotation.y = .5;
  await L.ready('../assets/sports/soccer-ball.png');
  if (socState.looped !== viewer) { L.loop(viewer); socState.looped = viewer; }
  const key = S.profile ? soccerKey(S.profile) : null;
  viewer._soccer = viewer._soccer || { fx: [], anim: null };
  viewer._soccer.team = SOC_TEAM[key] || ['#1a5d3a', '#e8c25a'];
  L.setBall(viewer, socState.ball); L.setBoots(viewer, socState.boots, socState.bootColour);
  L.setGloves(viewer, socKeeper() ? socState.gloves : null);
  for (const b of document.querySelectorAll('#roleSeg [data-role]')) b.classList.toggle('on', (b.dataset.role === 'keeper') === socKeeper());
  if (!socState.busy) { viewer.animation = new skinview3d.IdleAnimation(); for (const b of document.querySelectorAll('.vctl .chip')) b.classList.toggle('on', b.dataset.anim === 'idle'); }
}
for (const b of document.querySelectorAll('#roleSeg [data-role]')) b.onclick = () => {
  const p = S.profile; if (!p || !soccerKey(p)) return;
  applyKit(p, b.dataset.role === 'keeper' ? 'keeper' : 'home', 'soccer');
};
function socRun(f) {
  if (socState.busy || !viewer?._soccer) return;
  socState.busy = true; viewer.animation = null;
  f(() => { socState.busy = false; if (viewer) viewer.animation = new skinview3d.IdleAnimation(); });
}
function socArt(kind, item) {
  const L = SoccerLocker, team = viewer?._soccer?.team || ['#1a5d3a', '#e8c25a'], c = document.createElement('canvas');
  if (kind === 'ball') { c.width = c.height = 32; c.getContext('2d').drawImage(L.ballCanvas(item), 0, 0, 32, 32); return c; }
  if (kind === 'boot') { c.width = c.height = 16; c.getContext('2d').drawImage(L.bootCanvas(item, item.id === socState.boots ? socState.bootColour : null), 0, 0); return c; }
  if (kind === 'glove') { c.width = c.height = 16; c.getContext('2d').drawImage(L.gloveCanvas(item, team), 0, 0); return c; }
  const COL = { fire: ['#ff3d00', '#ffd54f'], frost: ['#8fd8ff', '#ffffff'], electric: ['#7df9ff', '#ffffff'], smoke: ['#6b7280', '#d1d5db'], classic: ['#fde68a', '#ffffff'], ice: ['#7dd3fc', '#ffffff'], team };
  c.width = 112; c.height = 64; const g = c.getContext('2d'), [x, y] = COL[item.id] || ['#e3bb55', '#ffffff'];
  if (kind === 'fx') {
    if (item.id === 'none') { g.fillStyle = '#8b93a7'; g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText('No trail', 56, 36); return c; }
    const gr = g.createLinearGradient(0, 0, 112, 0);
    if (item.id === 'rainbow') ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'].forEach((h, i) => gr.addColorStop(i / 5, h)); else { gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.6, x); gr.addColorStop(1, y); }
    g.fillStyle = gr; g.beginPath(); g.moveTo(4, 40); g.quadraticCurveTo(56, 6, 100, 30); g.lineTo(100, 38); g.quadraticCurveTo(56, 18, 4, 44); g.fill();
    g.fillStyle = '#f5f5f5'; g.fillRect(96, 28, 10, 10); return c;
  }
  if (kind === 'burst') {
    g.strokeStyle = '#f5f5f5'; g.lineWidth = 3; g.strokeRect(20, 10, 72, 50);
    for (let i = 0; i < 36; i++) { const r = 4 + ((i * 7919) % 26), an = i * 2.4; g.fillStyle = item.id === 'rainbow' || item.id === 'confetti' ? `hsl(${i * 40},90%,60%)` : (i % 2 ? x : y); g.fillRect(56 + Math.cos(an) * r, 34 + Math.sin(an) * r * .7, 3, 3); }
    return c;
  }
  g.fillStyle = '#e3bb55'; g.font = '600 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(kind === 'skill' ? '\u21bb' : '\u2605', 56, 34); return c;
}
function renderSoccerLab() {
  const L = window.SoccerLocker; if (!L) return;
  $('labTabs').innerHTML = '';
  for (const t of SOC_TABS) { const b = el('button', 'chip' + (t === socState.tab ? ' on' : ''), t); b.onclick = () => { socState.tab = t; renderSoccerLab(); }; $('labTabs').append(b); }
  $('labHint').hidden = false; $('labHint').textContent = (socState.msg ? socState.msg + '  ' : '') + SOC_HINTS[socState.tab] + (socState.tab === 'Keeper Gloves' && !socKeeper() ? ' Switch to Keeper to see them on.' : '');
  const T = $('labTiles'); T.innerHTML = ''; $('labAct').innerHTML = ''; $('labSw').hidden = true;
  const tile = (kind, item, on, click) => {
    const t = el('button', 'tile' + (on ? ' on' : ''));
    const a = el('div', 'tart'); a.append(socArt(kind, item)); t.append(a);
    const n = el('div', 'tnm'); n.textContent = item.name; t.append(n);
    const slot = SOC_SLOT[socState.tab], isOn = kind === 'skill' ? socSkillOn(item.id) : slot && socEquipped(slot) === item.id;
    const s = el('div', 'tsub'); s.textContent = isOn ? (kind === 'skill' ? 'On in game' : 'Equipped') : item.does ? 'Plays on ' + item.does : item.price || 'Store'; t.append(s);
    if (isOn) t.classList.add('equipped');
    t.onclick = click; T.append(t);
  };
  const act = (label, f) => { const b = el('button', 'small'); b.textContent = label; b.onclick = f; $('labAct').append(b); };
  const v = viewer, tab = socState.tab;
  // Clicking a tile only tries it on (preview). Nothing is saved until you press Equip.
  const equipBtn = (isSaved, changes, label) => {
    const b = el('button', 'small equip' + (isSaved ? ' done' : ''));
    b.textContent = isSaved ? 'Equipped ✓' : 'Equip ' + label;
    b.disabled = isSaved || socState.msg === 'Saving...';
    if (!isSaved) b.onclick = () => socSave(changes, label + ' equipped');
    $('labAct').append(b);
  };
  const named = (list, id) => (list.find(x => x.id === id) || {}).name || id;
  if (tab === 'Ball') {
    for (const b of L.BALLS) tile('ball', b, socState.ball === b.id, () => { socState.ball = b.id; v && L.setBall(v, b.id); renderSoccerLab(); });
    equipBtn(socEquipped('ball') === socState.ball, { ball: socState.ball }, named(L.BALLS, socState.ball));
  }
  if (tab === 'Boots') {
    for (const b of L.BOOTS) tile('boot', b, socState.boots === b.id, () => { socState.boots = b.id; socState.bootColour = null; v && L.setBoots(v, b.id, null); renderSoccerLab(); });
    const cur = L.BOOTS.find(b => b.id === socState.boots);
    if (cur?.colours.length) {
      const W = $('labSw'); W.hidden = false; W.innerHTML = '';
      for (const c of cur.colours) { const s = el('button', 'sw' + ((socState.bootColour || cur.base) === c ? ' on' : '')); s.style.background = c; s.title = 'Colourway ' + c; s.onclick = () => { socState.bootColour = c; v && L.setBoots(v, cur.id, c); renderSoccerLab(); }; W.append(s); }
    }
    const colour = cur && socState.bootColour && socState.bootColour !== cur.base ? socState.bootColour.replace('#', '').toLowerCase() : '';
    equipBtn(socEquipped('boots') === socState.boots && String(socState.saved.boot_colour || '').toLowerCase() === colour,
      { boots: socState.boots, boot_colour: colour }, named(L.BOOTS, socState.boots) + ' boots');
  }
  if (tab === 'Keeper Gloves') {
    for (const g of L.GLOVES) tile('glove', g, socState.gloves === g.id, () => { socState.gloves = g.id; v && socKeeper() && L.setGloves(v, g.id); renderSoccerLab(); });
    equipBtn(socEquipped('gloves') === socState.gloves, { gloves: socState.gloves }, named(L.GLOVES, socState.gloves) + ' gloves');
  }
  if (tab === 'Ball Trail') {
    for (const t of L.TRAILS) tile('fx', t, socState.trail === t.id, () => { socState.trail = t.id; renderSoccerLab(); socRun(d => L.kick(v, t.id, d)); });
    equipBtn(socEquipped('trail') === socState.trail, { trail: socState.trail }, named(L.TRAILS, socState.trail) + ' trail');
    act('Shoot again', () => socRun(d => L.kick(v, socState.trail, d)));
  }
  if (tab === 'Goal Explosion') {
    for (const e of L.EXPLOSIONS) tile('burst', e, socState.explosion === e.id, () => { socState.explosion = e.id; renderSoccerLab(); socRun(d => L.shootAtGoal(v, socState.trail, e.id, d)); });
    equipBtn(socEquipped('explosion') === socState.explosion, { explosion: socState.explosion }, named(L.EXPLOSIONS, socState.explosion) + ' goal explosion');
    act('Score again', () => socRun(d => L.shootAtGoal(v, socState.trail, socState.explosion, d)));
  }
  if (tab === 'Celebration') {
    socState.celly = socState.celly || socEquipped('celebration');
    for (const c of L.CELLYS) tile('celly', c, socState.celly === c.id, () => { socState.celly = c.id; renderSoccerLab(); socRun(d => L.celebrate(v, c.id, d)); });
    equipBtn(socEquipped('celebration') === socState.celly, { celebration: socState.celly }, named(L.CELLYS, socState.celly));
    act('Play again', () => socRun(d => L.celebrate(v, socState.celly, d)));
  }
  if (tab === 'Skill Moves') {
    for (const s of L.SKILLS) tile('skill', s, socState.skill === s.id, () => { socState.skill = s.id; renderSoccerLab(); socRun(d => L.skill(v, s.id, socState.trail, d)); });
    const cur = L.SKILLS.find(s => s.id === socState.skill);
    if (cur) act((socSkillOn(cur.id) ? 'Switch off: ' : 'Switch on: ') + cur.name, () => {
      const off = new Set(String(socState.saved.skills_off || '').split(',').filter(Boolean));
      if (off.has(cur.id)) off.delete(cur.id); else off.add(cur.id);
      socSave({ skills_off: [...off].join(',') }, cur.name + (off.has(cur.id) ? ' switched off' : ' switched on'));
    });
  }
}

const SOCCER_KEY = { kobeku: 'kob', kob: 'kob', athlitismos: 'au', au: 'au', dominion: 'dufc', dufc: 'dufc', whitecaps: 'wfc', team2: 'tm2', team3: 'tm3', stockton: 'stfc', wolfshead: 'whfc', blu: 'blu', cfc: 'cfc', stfc: 'stfc', tm2: 'tm2', tm3: 'tm3', wfc: 'wfc', whfc: 'whfc' };
const soccerKey = p => SOCCER_KEY[String(p.soccer?.team?.id || '').toLowerCase()] || SOCCER_KEY[String(p.soccer?.team?.abbrev || '').toLowerCase()] || null;
const dataUrl = async src => { const i = await loadImage(src); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/png'); };

async function applyKit(profile, variant, sport = 'hockey') {
  kitState.variant = variant; kitState.sport = sport;
  for (const b of document.querySelectorAll('#kitChips .chip')) b.classList.toggle('on', b.dataset.v === variant && (b.dataset.sport || 'hockey') === sport);
  let k = null;
  if (sport === 'soccer') {
    const key = soccerKey(profile);
    const cplKey = key && `${key}_${variant}`;
    if (cplKey && window.CPL_KITS?.kits.includes(cplKey)) {
      // the CPL client's HD kit, drawn the way the client draws it (armour.js cplLayers), with your number on the back
      k = { sport: 'soccer', personal: false, cpl: `../assets/kits/cpl/${cplKey}.png`, cplKey, number: Number(profile.soccer?.number) || 0 };
    } else if (key) { try { k = { sport: 'soccer', personal: false, data: await dataUrl(`../assets/kits/soccer/${key}_${variant}_jersey.png`), shorts: await dataUrl(`../assets/kits/soccer/${key}_${variant}_shorts.png`) }; } catch { k = null; } }
    if (lockerSport !== 'soccer') return;
    $('kitNote').textContent = k ? `${profile.soccer.team.name} football kit, ${pretty(variant)}.` : '';
    await showSkin(profile, k); return;
  }
  if (variant && profile.hockey?.team) k = await cs.kit(profile.hockey.team, variant);
  if (lockerSport === 'soccer') return;   // switched to football while the hockey kit was loading
  $('kitNote').textContent = k ? (k.personal ? 'Your own jersey, with your name and number.' : "The club's jersey. Your own name-and-number jersey appears once the hockey pack is installed.") : '';
  await showSkin(profile, k);
}

async function openProfile() {
  $('pName').textContent = S.account?.name || 'Not signed in';
  $('pTeam').textContent = ''; $('pFacts').innerHTML = ''; $('pGear').innerHTML = ''; $('pOwned').textContent = '';
  if (!S.account) {
    $('pNote').hidden = false; $('pNote').textContent = 'Sign in with Microsoft to see your skin, team and cosmetics.';
    $('kitChips').innerHTML = ''; $('kitNote').textContent = '';
    if (!viewer) await showSkin({ skin: null, slim: false }, null);
    return;
  }
  $('pNote').hidden = true;
  // the profile is fetched once and reused for a few minutes, so switching sport in the Locker is instant
  const fresh = S.profileCache && S.profileCache.who === S.account.name && Date.now() - S.profileCache.at < 5 * 60 * 1000;
  const r = fresh ? S.profileCache.r : await cs.profile().catch(e => ({ ok: false, error: String(e.message || e) }));
  if (r.ok && !fresh) S.profileCache = { who: S.account.name, at: Date.now(), r };
  if (!r.ok) { $('pNote').hidden = false; $('pNote').textContent = r.error; if (!viewer) await showSkin({ skin: null, slim: false }, null).catch(() => {}); return; }
  const p = r.profile; S.profile = p;
  $('pName').textContent = p.ign;
  const sport = S.current === 'soccer' ? 'soccer' : S.current === 'hockey' ? 'hockey' : 'other';
  const facts = [];
  if (sport === 'hockey') {
    if (p.hockey?.team) facts.push(['Hockey team', p.kits?.team || p.hockey.team.toUpperCase()]);
    if (p.hockey?.position) facts.push(['Position', p.hockey.position]);
    if (p.hockey?.number != null) facts.push(['Number', '#' + p.hockey.number]);
    if (p.hockey?.tier) facts.push(['Tier', pretty(p.hockey.tier)]);
  } else if (sport === 'soccer') {
    if (p.soccer?.team) facts.push(['Football team', p.soccer.team.name]);
    if (p.soccer?.position) facts.push(['Position', p.soccer.position]);
    if (p.soccer?.number != null) facts.push(['Number', '#' + p.soccer.number]);
    if (p.soccer?.captain) facts.push(['Role', 'Captain']);
  }
  $('pFacts').innerHTML = facts.map(([k, v]) => `<div class="fact"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('') || `<div class="fact"><span>Team</span><b>${sport === 'other' ? 'No profile for this sport yet' : 'Free agent'}</b></div>`;
  $('pTeam').textContent = sport === 'hockey' ? (p.kits?.team || '') : sport === 'soccer' ? (p.soccer?.team?.name || '') : '';
  $('tryon').hidden = sport === 'other';
  lockerSport = sport === 'soccer' ? 'soccer' : 'hockey';
  if (!p.skin && p.skinError) { $('pNote').hidden = false; $('pNote').textContent = "Couldn't load your skin (" + p.skinError + '). Showing a default model.'; }
  if (p.service !== 'ok') {
    $('pNote').hidden = false;
    $('pNote').textContent = p.service === 'offline' ? "Couldn't reach the Crafted Sports servers. Your skin is shown; team and cosmetics will load when you're back online."
      : 'Team and cosmetics will show here once the profile service is switched on. Your skin is shown meanwhile.';
  }
  // gear: hockey cosmetics only on the hockey profile
  const eq = sport === 'hockey' ? (p.equipped || {}) : {};
  const rows = [];
  for (const [key, label] of GEAR) {
    const v = eq[key]; if (!v) continue;
    const name = typeof v === 'string' ? v : (v.name || v.mask || '');
    if (!name || name === 'none') continue;
    const col = typeof v === 'object' && v.color && /^#[0-9a-f]{6}$/i.test(v.color) ? `<i class="sw" style="background:${v.color}"></i>` : '';
    rows.push(`<div class="g"><span>${esc(label)}</span><b>${col}${esc(pretty(name))}</b></div>`);
  }
  $('pGear').innerHTML = rows.join('') || `<div class="g empty">${sport === 'hockey' ? 'Nothing equipped yet. The Store has sticks, masks, celebrations and more.' : sport === 'soccer' ? 'Nothing equipped yet. Try balls, boots, trails and more in the Locker above.' : ''}</div>`;
  $('pOwned').textContent = sport === 'hockey' && p.owned.length ? `${p.owned.length} item${p.owned.length === 1 ? '' : 's'} owned` : '';
  // kit chips: the selected sport's kits only
  const vs = sport === 'hockey' ? (p.kits?.variants || []) : [];
  const sk = sport === 'soccer' ? soccerKey(p) : null;
  $('kitChips').innerHTML = '';
  for (const v of vs) { const b = el('button', 'chip', pretty(v)); b.dataset.v = v; b.onclick = () => applyKit(p, v); $('kitChips').append(b); }
  if (sk) for (const v of ['home', 'away', 'keeper']) { const b = el('button', 'chip', pretty(v)); b.dataset.v = v; b.dataset.sport = 'soccer'; b.onclick = () => applyKit(p, v, 'soccer'); $('kitChips').append(b); }
  if (sport === 'hockey') setupTry(p); else if (sport === 'soccer') setupSoccerTry(p);
  if (sk) applyKit(p, 'home', 'soccer');
  else if (vs.length) applyKit(p, vs.includes(kitState.variant) ? kitState.variant : vs[0]);
  else { $('kitNote').textContent = sport === 'soccer' ? (p.soccer?.team ? '' : 'Join a team and your football kit shows up here.') : sport === 'hockey' ? (p.hockey?.team ? '' : 'Join a team and your jerseys show up here.') : ''; await showSkin(p, null); }
}

// store
let catalog = null, storeCat = 'All';
async function openStore() {
  $('storeWho').textContent = S.account?.name || 'sign in first';
  if (!catalog) catalog = await cs.catalog();
  if (S.account && !S.profile) { const r = await cs.profile(); if (r.ok) S.profile = r.profile; }
  renderStore();
}
function renderStore() {
  const cats = ['All', ...new Set(catalog.map(i => i.cat))];
  $('storeCats').innerHTML = '';
  for (const c of cats) { const b = el('button', 'chip' + (c === storeCat ? ' on' : ''), esc(c)); b.onclick = () => { storeCat = c; renderStore(); }; $('storeCats').append(b); }
  $('storeGrid').innerHTML = '';
  for (const i of catalog.filter(i => storeCat === 'All' || i.cat === storeCat)) {
    const hue = [...i.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
    const card = el('div', 'item');
    card.innerHTML = `<div class="art img" style="--h:${hue}"><img src="${esc(i.img)}" alt=""><em>${esc(i.cat)}${i.ending ? ' · ending soon' : ''}</em></div>
      <div class="inm">${esc(i.name)}</div>
      <div class="irow"><b>$${(i.price / 100).toFixed(2)} <small>${esc(i.cur)}${i.sub ? ' · sub' : ''}</small></b></div>`;
    card.querySelector('img').addEventListener('error', e => e.target.remove());   // (inline handlers are blocked by the page's CSP)
    const btn = el('button', 'buy', 'Buy');
    btn.onclick = async () => {
      const r = await cs.buy(i.id);
      if (!r.ok) showStoreError(r.error); else { btn.textContent = 'Opened in browser'; setTimeout(() => { btn.textContent = 'Buy'; }, 5000); }
    };
    card.querySelector('.irow').append(btn);
    $('storeGrid').append(card);
  }
}

function showStoreError(msg) {
  let n = $('storeErr');
  if (!n) { n = el('div', 'error'); n.id = 'storeErr'; $('store').insertBefore(n, $('storeGrid')); }
  n.hidden = false; n.textContent = msg; clearTimeout(n._t); n._t = setTimeout(() => { n.hidden = true; }, 7000);
}


// ── league desk: standings, leaders and the results ticker (src/league.js) ──────────────────────────────
const LG = {};          // sport id -> { ok, data, error }
document.addEventListener('error', e => {
  const t = e.target;
  if (t.tagName !== 'IMG') return;
  if (/mc-heads\.net/.test(t.src) && !t.dataset.fb) { t.dataset.fb = 1; t.src = '../assets/sports/steve-head.png'; }
  else if (/tlogo|mlogo|klogo/.test(t.className)) t.style.visibility = 'hidden';   // a club logo that didn't load
}, true);
const avatar = (p, size) => `https://mc-heads.net/avatar/${encodeURIComponent(p.uuid || p.name || 'MHF_Steve')}/${size || 32}`;
const fmtVal = (l, v) => l.pct ? (v >= 1 ? '1.000' : v.toFixed(3).replace(/^0/, '')) : v;
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; };
const shortDate = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

async function loadLeague(force) {
  const id = S.current;
  const i = inst();
  if (!i || i.status === 'soon') { LG[id] = { ok: false, error: 'soon' }; renderDesk(); renderTicker(); return; }
  if (!LG[id]) renderDesk();
  let r;
  try { r = await cs.league(id, force); } catch (e) { r = { ok: false, error: e.message }; }
  LG[id] = r;
  if (S.current !== id) return;
  renderDesk();
  renderTicker();
  if (!$('league').hidden) renderLeague();
}

const logoImg = (src, alt, cls = 'tlogo') => src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy">` : `<i class="${cls} none"></i>`;
const teamLine = p => `${p.logo ? logoImg(p.logo, '', 'mlogo') : ''}${esc(p.team || '')}`;
function formPips(f) { return `<span class="form">${(f || []).map(x => `<i class="f${x}">${x === 'O' ? 'OT' : x}</i>`).join('')}</span>`; }

function standingsHtml(d, rows, compact) {
  const cols = compact ? ['GP', d.columns[d.columns.length - 1]] : d.columns;
  const pick = t => compact ? [t.cells[0], t.cells[t.cells.length - 1]] : t.cells;
  return `<table class="std${compact ? ' mini' : ''}"><thead><tr><th class="pos">#</th><th class="tm">Team</th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}${compact ? '' : '<th class="fm">Form</th>'}</tr></thead><tbody>
    ${rows.map((t, k) => `<tr${k === 0 && t.gp ? ' class="lead"' : ''}><td class="pos">${k + 1}</td><td class="tm">${logoImg(t.logo, t.abbr)}<b>${esc(t.abbr)}</b><span>${esc(t.name)}</span></td>${pick(t).map((c, ci, a) => `<td${ci === a.length - 1 ? ' class="pts"' : ''}>${esc(c)}</td>`).join('')}${compact ? '' : `<td class="fm">${formPips(t.form)}</td>`}</tr>`).join('')}
  </tbody></table>`;
}

function renderDesk() {
  const r = LG[S.current];
  const tb = $('deskTable'), ld = $('deskLeaders');
  const i = inst();
  const word = S.current === 'soccer' ? 'Table' : 'Standings';
  if (!r) { tb.innerHTML = `<div class="dhead">${word}</div><div class="dempty">Loading…</div>`; ld.innerHTML = ''; return; }
  if (!r.ok) {
    tb.innerHTML = r.error === 'soon' ? `<div class="dhead">${esc(i?.name || '')}</div><div class="dempty">Coming soon - no league yet.</div>` : `<div class="dhead">${word}</div><div class="dempty">Couldn't load the league right now.</div>`;
    ld.innerHTML = '';
    return;
  }
  const d = r.data;
  const isTable = d.sport === 'soccer';
  tb.innerHTML = `<div class="dhead">${isTable ? 'Table' : 'Standings'} <button class="dmore" data-go="league">${isTable ? 'Full table' : 'Full standings'}</button></div>`
    + (d.table.length ? standingsHtml(d, d.table.slice(0, 6), true) : '<div class="dempty">No games played yet this season.</div>');
  const cats = d.leaders.filter(l => l.rows.length).slice(0, 3);
  ld.innerHTML = `<div class="dhead">Leaders <button class="dmore" data-go="league">All stats</button></div>`
    + (cats.length ? `<div class="ltiles">${cats.map(l => { const p = l.rows[0]; return `<div class="ltile"><img src="${avatar(p, 40)}" alt="" loading="lazy"><div class="lt"><small>${esc(l.label)}</small><b>${esc(p.name)}</b><span>${teamLine(p)}</span></div><div class="lv">${fmtVal(l, p.value)}</div></div>`; }).join('')}</div>` : '<div class="dempty">Leaders show once games are played.</div>');
  for (const b of document.querySelectorAll('[data-go]')) b.onclick = () => showView(b.dataset.go);
}

function renderTicker() {
  const r = LG[S.current];
  const run = $('tRun');
  const res = r && r.ok ? r.data.results : [];
  $('ticker').classList.toggle('empty', !res.length);
  if (!res.length) { run.innerHTML = ''; return; }
  $('tLabel').textContent = 'Final';
  const one = res.map(g => {
    const hw = g.hs > g.as, aw = g.as > g.hs;
    return `<span class="tg">${g.homeLogo ? logoImg(g.homeLogo, '', 'klogo') : ''}<b class="${hw ? 'w' : ''}">${esc(g.home)}</b><em>${g.hs}</em><i>-</i><em>${g.as}</em><b class="${aw ? 'w' : ''}">${esc(g.away)}</b>${g.awayLogo ? logoImg(g.awayLogo, '', 'klogo') : ''}${g.ot ? '<u>OT</u>' : ''}<small>${shortDate(g.when)}</small></span>`;
  }).join('');
  run.innerHTML = one + one;   // twice, so the loop is seamless
  run.style.animationDuration = Math.max(20, res.length * 5) + 's';
}

function renderLeague() {
  const r = LG[S.current];
  const i = inst();
  $('lgKicker').textContent = i?.tagline || '';
  $('lgTitle').textContent = (r && r.ok && r.data.season) || (i?.season?.label) || 'League';
  $('lgRefresh').onclick = () => { $('lgUpdated').textContent = 'Refreshing…'; loadLeague(true); };
  $('lgSite').onclick = () => { WEB.site = siteFor(S.current) || WEB.site; showView('web'); };
  if (!r) { $('lgTable').innerHTML = '<div class="dempty">Loading…</div>'; $('lgLeaders').innerHTML = ''; return; }
  if (!r.ok) { $('lgTable').innerHTML = `<div class="dempty">${r.error === 'soon' ? 'No league for this sport yet.' : "Couldn't load the league: " + esc(r.error)}</div>`; $('lgLeaders').innerHTML = ''; $('lgUpBox').hidden = true; return; }
  const d = r.data;
  $('lgUpdated').textContent = (r.stale ? 'Offline - showing ' : 'Updated ') + ago(d.updated);
  $('lgTable').previousElementSibling.textContent = d.sport === 'soccer' ? 'Table' : 'Standings';
  $('lgTable').innerHTML = d.table.length ? standingsHtml(d, d.table, false) : '<div class="dempty">No games played yet this season.</div>';
  $('lgLeaders').innerHTML = d.leaders.map(l => `<div class="board lb"><div class="btitle">${esc(l.label)}</div>${l.rows.length ? `<ol>${l.rows.slice(0, 5).map((p, k) => `<li${k === 0 ? ' class="first"' : ''}><span class="rk">${k + 1}</span><img src="${avatar(p, 24)}" alt="" loading="lazy"><span class="nm"><b>${esc(p.name)}</b><small>${teamLine(p)}</small></span><span class="vl">${fmtVal(l, p.value)}</span></li>`).join('')}</ol>` : '<div class="dempty">No one yet.</div>'}</div>`).join('');
  $('lgUpBox').hidden = !d.upcoming.length;
  $('lgUpcoming').innerHTML = d.upcoming.map(g => `<div class="up"><span>${shortDate(g.date)}</span><b>${g.awayLogo ? logoImg(g.awayLogo, '', 'mlogo') : ''}${esc(g.away)}</b><i>@</i><b>${g.homeLogo ? logoImg(g.homeLogo, '', 'mlogo') : ''}${esc(g.home)}</b></div>`).join('');
}

// ── the league websites, inside the launcher (src/sites.js) ──────────────────────────────────────────
const SITES = [{ id: 'hockey', name: 'Crafted Hockey', host: 'craftedhockey.com' }, { id: 'soccer', name: 'Crafted Premier League', host: 'craftedpremier.com' }];
const WEB = { site: null, shown: false };
const siteFor = id => SITES.find(x => x.id === id)?.id || null;

function siteCovered() {
  // the website view sits above the page, so it steps aside for anything drawn over it
  return !$('settings').hidden || !$('signin').hidden || !!document.getElementById('splash');
}

async function syncSite(reload) {
  const want = !$('web').hidden && !siteCovered();
  if (!want) { if (WEB.shown) { cs.siteHide(); WEB.shown = false; } return; }
  WEB.site = WEB.site || siteFor(S.current) || 'hockey';
  $('wSites').innerHTML = SITES.map(x => `<button class="wsite${x.id === WEB.site ? ' on' : ''}" data-site="${x.id}">${esc(x.name)}</button>`).join('');
  for (const b of document.querySelectorAll('[data-site]')) b.onclick = () => { WEB.site = b.dataset.site; syncSite(true); };
  const st = await cs.siteShow(WEB.site, areaBounds());
  WEB.shown = true;
  siteState(st);
}

function areaBounds() {
  const r = $('wArea').getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

function siteState(st) {
  if (!st) return;
  const u = st.url ? new URL(st.url) : null;
  $('wAddr').innerHTML = u ? `<i class="lock">&#xE72E;</i>${esc(u.hostname)}<span>${esc(u.pathname === '/' ? '' : u.pathname)}</span>` : '';
  $('wAddr').classList.toggle('loading', !!st.loading);
  const back = document.querySelector('[data-nav="back"]'), fwd = document.querySelector('[data-nav="forward"]');
  if (back) back.disabled = !st.back;
  if (fwd) fwd.disabled = !st.forward;
  $('wMsg').textContent = st.error ? "Couldn't load the page - " + st.error : 'Loading';
}

for (const b of document.querySelectorAll('[data-nav]')) b.onclick = async () => siteState(await cs.siteNav(b.dataset.nav));
cs.on('site', siteState);
new ResizeObserver(() => { if (WEB.shown) cs.siteBounds(areaBounds()); }).observe($('wArea'));
window.addEventListener('resize', () => { if (WEB.shown) cs.siteBounds(areaBounds()); });
// step aside while settings / sign-in are open
const coverWatch = new MutationObserver(() => syncSite());
for (const id of ['settings', 'signin']) coverWatch.observe($(id), { attributes: true, attributeFilter: ['hidden'] });
document.addEventListener('splash-gone', () => syncSite());

// keep the desk fresh while the launcher is open
setInterval(() => { if (!S.busy && !S.running && document.visibilityState === 'visible') loadLeague(); }, 3 * 60 * 1000);
