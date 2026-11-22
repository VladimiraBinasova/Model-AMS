/* ===== Aplikácia: navigácia, udalosti ===== */
const NAV = [
  ['model', 'Model synergie', '6.3–6.6'], ['audit', 'Audit linky', 'kroky 1–5'], ['ahp', 'Váhy AHP', 'krok 3'],
  ['dematel', 'DEMATEL', 'kroky 4–5'], ['scenare', 'Scenáre a κ', 'krok 6'], ['vyhodnotenie', 'Vyhodnotenie', 'kroky 7–8'],
  ['karta', 'Karta synergie', 'výstup'], ['metodika', 'Metodika a cyklus', '6.7–6.8'], ['ulozene', 'Súbory a verzie', 'JSON, CSV']
];
function setPath(o, path, v) { const ks = path.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]]; x[ks[ks.length - 1]] = v; }

function renderNav() { $('#nav').innerHTML = NAV.map(n => `<a href="#${n[0]}" class="${ui.view === n[0] ? 'on' : ''}" ${ui.view === n[0] ? 'aria-current="page"' : ''}>${n[1]}<small>${n[2]}</small></a>`).join(''); }
function renderTop() {
  const V = VIEWS[ui.view];
  $('#ttl').innerHTML = `<h1>${V.t}</h1><small>${V.sub}</small>`;
  $('#lines').innerHTML = S.lines.map(l => `<button class="chip ${l.id === S.lineId ? 'on' : ''}" data-act="line" data-id="${l.id}">${esc(l.name)} <small>${esc(l.sub)}</small></button>`).join('') + `<button class="chip" data-act="newline">+ Nová linka</button>`;
}
function full() {
  renderNav(); renderTop(); C = st();
  $('#view').innerHTML = VIEWS[ui.view].html();
  refresh();
}
function refresh() {
  C = st(); const V = VIEWS[ui.view];
  $$('#view [data-r]').forEach(el => { const [n, arg] = el.dataset.r.split(/:(.*)/); const f = V.R[n]; if (f) { try { el.innerHTML = f(arg); } catch (err) { el.innerHTML = '<span class="pill bad">Chyba výpočtu</span>'; console.error(err); } } });
}
function route() { const h = location.hash.slice(1); ui.view = VIEWS[h] ? h : 'audit'; full(); window.scrollTo(0, 0); }

const ACT = {
  ...SAVE_ACT,
  ...FORM_ACT,
  line(a) { S.lineId = a.dataset.id; ui.kappaScen = null; ui.demExp = 0; full(); },
  dupline() {
    const src = line(), n = S.seq++, id = 'L' + n + '-' + Date.now().toString(36);
    const c = JSON.parse(JSON.stringify(src)); Object.assign(c, { id, name: src.name + ' (kópia)', builtin: false });
    S.lines.splice(S.lines.indexOf(src) + 1, 0, c); S.lineId = id; closeModal(); full(); toast('Linka je skopírovaná');
  },
  delline() {
    if (S.lines.length < 2) return;
    modal(`<h2>Odstrániť linku ${esc(line().name)}?</h2><p class="small muted">Odstránia sa namerané hodnoty, matice expertov, scenáre a akčný plán tejto linky. Uložené verzie a súbory zostanú nezmenené.</p><div class="row"><button class="btn danger" data-act="dodel">Odstrániť</button><button class="btn" data-act="closemodal">Zrušiť</button></div>`);
  },
  dodel() { const id = S.lineId; S.lines = S.lines.filter(l => l.id !== id); delete S.ev[id]; S.lineId = S.lines[0].id; closeModal(); full(); toast('Linka je odstránená'); },
  mode(a) { if (a.dataset.v === 'ind' && !line().ind) return; line().mode = a.dataset.v; full(); },
  msel(a) { ui.modelSel = a.dataset.k; refresh(); },
  selind(a) { if (ui.selInd === a.dataset.k) return; ui.selInd = a.dataset.k; $$('tr[data-ind]').forEach(r => r.classList.toggle('sel', r.dataset.ind === ui.selInd)); refresh(); },
  imbp(a) { const v = a.dataset.v.split(',').map(Number); ui.imb = { T: v[0], S: v[1], P: v[2] }; full(); },
  ahpdim(a) { ui.ahpDim = a.dataset.v; full(); },
  ahpex() { S.ahp[ui.ahpDim] = JSON.parse(JSON.stringify(AHP_EXAMPLE[ui.ahpDim])); full(); },
  ahpones() { S.ahp[ui.ahpDim] = [[1, 1, 1, 1], [1, 1, 1], [1, 1], [1]]; full(); },
  ahpapply() {
    const r = ahp(ahpMatrix(ui.ahpDim)), inds = INDICATORS.filter(i => i.d === ui.ahpDim), w = r.w.map(r2);
    const diff = r2(1 - w.reduce((a, b) => a + b, 0)); w[w.indexOf(Math.max(...w))] = r2(Math.max(...w) + diff);
    inds.forEach((i, k) => line().ind[i.c].w = w[k]); refresh(); toast(`Váhy dimenzie ${ui.ahpDim} zapísané do auditu (${line().name})`);
  },
  demexp(a) { ui.demExp = +a.dataset.v; full(); },
  demadd() { const l = line(); l.dem.push(JSON.parse(JSON.stringify(l.dem[ui.demExp]))); ui.demExp = l.dem.length - 1; full(); },
  demdel() { const l = line(); if (l.dem.length > 1) { l.dem.splice(ui.demExp, 1); ui.demExp = 0; full(); } },
  scsel(a) { ui.scSel = a.dataset.k; $$('tr[data-row]').forEach(r => r.classList.toggle('sel', r.dataset.row === ui.scSel)); refresh(); },
  scedit() { ui.scEdit = !ui.scEdit; full(); },
  scadd() {
    const l = line(), s0 = st(l);
    if (!s0.complete) { toast('Scenár sa dá pridať, keď sú v audite zadané všetky hodnoty.'); return; }
    const used = new Set(l.scen.map(s => s.id)); let n = 1; while (used.has('S' + n)) n++;
    l.scen.push({ id: 'S' + n, kind: 'int', foc: s0.weak, name: 'integrovaný, hrana ' + EDGES[s0.weak].lab, meas: '', I: { ...s0.I }, q: { ...s0.q }, Y: r2(s0.Y), cost: null, ad: l.mode === 'ind' && l.ind ? { T1: l.ind.T1.x, T5: l.ind.T5.x, P5: l.ind.P5.x, S1: l.ind.S1.x } : { ...l.adapt } });
    ui.scSel = 'S' + n; ui.scEdit = true; full();
  },
  scdel(a) { const l = line(); l.scen.splice(+a.dataset.v, 1); full(); },
  evgen() { S.ev[line().id] = genDemo(line(), Math.floor(Math.random() * 1e6)); full(); },
  evclear() { S.ev[line().id] = { S0: '', S1: '', S2: '', S3: '', S4: '', demo: false, B: 1000, intId: evData().intId }; full(); },
  kadd() { const w = st().weak; line().plan.push({ m: '', e: w ? EDGES[w].lab : 'S–P', r: '', t: '' }); full(); },
  kdel(a) { line().plan.splice(+a.dataset.v, 1); full(); },
  kcopy() { copyText(cardText()); },
  step(a) { ui.stepSel = +a.dataset.v; refresh(); },
  cyc(a) { ui.cycSel = +a.dataset.v; refresh(); },
  imp() { modal(`<h2>Vložiť obsah súboru</h2><p class="small muted">Ak sa súbor nedá vybrať, otvorte ho v textovom editore, skopírujte celý obsah a vložte ho sem. Prijme sa projekt (JSON) aj údaje linky (CSV).</p><textarea class="inp" style="min-height:220px" id="pastein" placeholder="{ … } alebo Kód;Indikátor;…"></textarea><div class="row"><button class="btn pri" data-act="dopaste">Načítať</button><button class="btn" data-act="closemodal">Zrušiť</button></div>`); },
  dopaste() { const t = $('#pastein').value; if (!t.trim()) return; closeModal(); openText('vložený text', t, null); },
  closemodal() { closeModal(); }
};

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  const f = ACT[a.dataset.act]; if (!f) return;
  if (a.tagName === 'A') e.preventDefault();
  f(a); save();
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-act]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.wz) { e.preventDefault(); wzEnter(e.target); }
  if (e.key === 'Escape') { if ($('#modal').classList.contains('on')) closeModal(); }
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); FileIO.save(e.shiftKey); }
    else if (k === 'o' && !e.shiftKey) { e.preventDefault(); FileIO.open(); }
  }
});
document.addEventListener('focusin', e => {
  const tr = e.target.closest && e.target.closest('tr[data-ind]');
  if (tr && tr.dataset.ind !== ui.selInd) { ui.selInd = tr.dataset.ind; $$('tr[data-ind]').forEach(r => r.classList.toggle('sel', r.dataset.ind === ui.selInd)); refresh(); }
});
function onInput(e) {
  const el = e.target.closest && e.target.closest('[data-in]'); if (!el) return;
  const key = el.dataset.in, t = el.dataset.t || 'n';
  let val;
  if (el.type === 'checkbox') val = el.checked;
  else if (t === 's') val = el.value;
  else { val = pnum(el.value); el.classList.toggle('bad', !fin(val) && el.value.trim() !== ''); if (!fin(val)) val = null; }
  const [scope, a1, a2] = key.split(':');
  if (scope === 'L') { setPath(line(), a1, val); if (a1 === 'name' || a1 === 'sub') renderTop(); }
  else if (scope === 'U') setPath(ui, a1, val);
  else if (scope === 'G') { setPath(S, a1, val); save(); full(); return; }
  else if (scope === 'P') { setPath(S, a1, val); $$('[data-in="P:' + a1 + '"]').forEach(x => { if (x !== el) x.value = val; }); }
  else if (scope === 'A') { const i = +a1, j = +a2; S.ahp[ui.ahpDim][i][j - i - 1] = SAATY[+el.value]; }
  else if (scope === 'D') line().dem[ui.demExp][+a1][+a2] = +el.value;
  else if (scope === 'E') { evData()[a1] = a1 === 'B' ? +el.value : val; }
  else if (scope === 'SC') {
    const sc = line().scen[+a1]; setPath(sc, a2, val);
    if (a2 === 'kind' || a2 === 'foc') {
      if (a2 === 'kind') sc.foc = val === 'iso' ? 'T' : 'TS';
      sc.name = sc.kind === 'iso' ? 'izolovaná dimenzia ' + sc.foc : 'integrovaný, hrana ' + elab(sc.foc);
      if (e.type === 'change' || el.tagName === 'SELECT') { save(); full(); return; }
    }
  }
  if (el.type === 'range' && el.nextElementSibling) el.nextElementSibling.textContent = fmt(val);
  refresh(); save();
}
document.addEventListener('input', onInput);
document.addEventListener('input', e => {
  if (e.target.closest && e.target.closest('#nlform, #pjform')) $$('.ferr').forEach(x => { x.textContent = ''; });
  if (e.target.dataset && e.target.dataset.wz) wzInput(e.target);
});
document.addEventListener('submit', e => {
  if (e.target.id === 'nlform') { e.preventDefault(); saveLineForm(); save(); }
  if (e.target.id === 'pjform') { e.preventDefault(); saveProjectForm(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'stskip') { try { e.target.checked ? localStorage.setItem(START_KEY, 'skip') : localStorage.removeItem(START_KEY); } catch (err) { /* bez úložiska */ } }
  if (e.target.id === 'openfile' && e.target.files[0]) { const f = e.target.files[0]; e.target.value = ''; readFileInput(f); }
});
window.addEventListener('hashchange', route);

S = load();
$('#round2').checked = S.round2 !== false;
$('#projname').value = S.project.name;
FileIO.init();
route();
Store.init();
$('#brandicon').innerHTML = appIcon(30, 'brand');
initStart();
window.addEventListener('beforeunload', e => { if (FileIO.name && FileIO.dirty) { e.preventDefault(); e.returnValue = ''; } });
