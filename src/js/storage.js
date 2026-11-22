/* ===== Súbory a uložené verzie: projekt JSON, výmena údajov cez CSV, verzie v účte alebo prehliadači ===== */
const SAVES_KEY = 'ams-synergia-saves-v1';
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]);
const stamp = (d) => new Date(d).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* Úložisko: účet cez databázu artefaktu (ak je dostupná), inak tento prehliadač */
const Store = {
  mode: 'local', db: null, uid: null, dl: null, saves: [], loading: false, note: '',
  localList() { try { const a = JSON.parse(localStorage.getItem(SAVES_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } },
  localWrite(a) { try { localStorage.setItem(SAVES_KEY, JSON.stringify(a)); return true; } catch (e) { return false; } },
  async init() {
    this.saves = this.localList().map(r => ({ ...r, where: 'local' }));
    if (ui.view === 'ulozene') refresh();
    if (!(window.claude && typeof window.claude.use === 'function')) return;
    try {
      const [db, user, dl] = await Promise.all([claude.use('db'), claude.use('user'), claude.use('downloads')]);
      this.dl = dl || null;
      const uid = user ? await user.id() : null;
      if (db && uid) { this.db = db; this.uid = uid; this.mode = 'cloud'; await this.list(); }
    } catch (e) { /* zostáva lokálne úložisko */ }
    if (ui.view === 'ulozene') refresh();
  },
  col() { return this.db.collection('data/users/' + this.uid); },
  async list() {
    const local = this.localList().map(r => ({ ...r, where: 'local' }));
    if (this.mode !== 'cloud') { this.saves = local; return; }
    this.loading = true; this.note = '';
    try {
      const snap = await withTimeout(this.col().orderBy('at', 'desc').limit(200).get(), 10000);
      const cloud = snap.docs.filter(d => d.exists && d.data().kind === 'save').map(d => ({ ...d.data(), id: d.id, where: 'cloud' }));
      this.saves = [...cloud, ...local].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    } catch (e) {
      this.saves = local;
      this.note = 'Uložené stavy v účte sa nepodarilo načítať. Zobrazujú sa len stavy z tohto prehliadača.';
    }
    this.loading = false;
  },
  record(name, note) {
    return { kind: 'save', v: 1, name, note, at: new Date().toISOString(), summary: S.lines.map(l => l.name + ' · TSI ' + fmt(st(l).TSI, 3)), state: JSON.parse(JSON.stringify(S)) };
  },
  async add(name, note) {
    const rec = this.record(name, note);
    if (this.mode === 'cloud') {
      try { const id = 'save-' + Date.now().toString(36); await withTimeout(this.col().doc(id).set(rec), 10000); await this.list(); return 'cloud'; }
      catch (e) { if (e && e.code === 'quota_exceeded') { toast('Úložisko v účte je plné. Odstráňte staršie stavy.'); return null; } }
    }
    const a = this.localList(); a.unshift({ ...rec, id: 'save-' + Date.now().toString(36) });
    if (!this.localWrite(a)) { toast('Stav sa nepodarilo uložiť. Stiahnite ho ako súbor.'); return null; }
    await this.list(); return 'local';
  },
  find(id) { return this.saves.find(s => s.id === id); },
  async remove(id) {
    const r = this.find(id); if (!r) return;
    if (r.where === 'cloud') { try { await withTimeout(this.col().doc(id).delete(), 10000); } catch (e) { toast('Stav sa nepodarilo odstrániť. Skúste to znova.'); return; } }
    else this.localWrite(this.localList().filter(s => s.id !== id));
    await this.list();
  }
};

/* Stiahnutie súboru: cez platformu (claude.ai), inak bežné stiahnutie v prehliadači */
async function downloadFile(filename, text, mime) {
  if (Store.dl) {
    try { await Store.dl.save({ filename, data: new Blob([text], { type: mime }) }); toast('Súbor ' + filename + ' je uložený'); return true; }
    catch (e) { if (e && e.code === 'declined') return false; if (e && e.code === 'rate_limited') { toast('Počkajte chvíľu a skúste to znova.'); return false; } }
  }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = filename;
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Sťahuje sa ' + filename);
    return true;
  } catch (e) { copyText(text); return false; }
}
const fileSafe = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'projekt';
const dayTag = () => new Date().toISOString().slice(0, 10);
const plural = (n, a, b, c) => n + ' ' + (n === 1 ? a : n > 1 && n < 5 ? b : c);
function canPrint() { return !(window.claude && window.claude.use) && window.self === window.top; }

/* Projekt v súbore: otvorenie a uloženie späť do toho istého súboru (kde to prehliadač dovolí) */
const FILE_KEY = 'ams-synergia-file-v1';
const FileIO = {
  handle: null, name: '', dirty: false, savedAt: null, snap: null,
  json() { return JSON.stringify(S, (k, v) => (k === 'lineId' ? undefined : v)); },
  init() {
    try { const o = JSON.parse(localStorage.getItem(FILE_KEY) || 'null'); if (o) { this.name = o.name || ''; this.savedAt = o.savedAt || null; this.dirty = !!o.dirty; } } catch (e) { /* bez úložiska */ }
    this.snap = this.dirty ? null : this.json(); this.status();
  },
  persist() { try { localStorage.setItem(FILE_KEY, JSON.stringify({ name: this.name, savedAt: this.savedAt, dirty: this.dirty })); } catch (e) { /* bez úložiska */ } },
  check() { if (this.snap !== null) this.dirty = this.json() !== this.snap; this.persist(); this.status(); },
  pickers() { return !Store.dl && window.self === window.top && typeof window.showOpenFilePicker === 'function' && typeof window.showSaveFilePicker === 'function'; },
  fileName() { return (fileSafe(S.project && S.project.name) || 'projekt') + '.json'; },
  status() {
    const el = document.getElementById('filestatus'); if (!el) return;
    if (!this.name) { el.textContent = 'Projekt zatiaľ nie je uložený v súbore.'; return; }
    el.innerHTML = `Súbor <b>${esc(this.name)}</b><br>${this.dirty ? '<span class="dirty">neuložené zmeny</span>' : this.savedAt ? 'uložené ' + stamp(this.savedAt) : 'bez zmien'}`;
  },
  clean(name) { this.snap = this.json(); this.dirty = false; this.savedAt = Date.now(); if (name) this.name = name; this.persist(); this.status(); },
  reset() { this.handle = null; this.name = ''; this.savedAt = null; this.snap = this.json(); this.dirty = false; this.persist(); this.status(); },
  async save(as) {
    const text = projectJSON(S);
    if (this.pickers()) {
      try {
        if (!this.handle || as) this.handle = await window.showSaveFilePicker({ suggestedName: this.name || this.fileName(), types: [{ description: 'Projekt modelu synergie', accept: { 'application/json': ['.json'] } }] });
        const w = await this.handle.createWritable(); await w.write(text); await w.close();
        this.clean(this.handle.name); toast('Uložené do súboru ' + this.handle.name); return;
      } catch (e) { if (e && e.name === 'AbortError') return; this.handle = null; }
    }
    const fn = this.name || this.fileName();
    if (await downloadFile(fn, text, 'application/json')) this.clean(fn);
  },
  async open() {
    if (this.pickers()) {
      try {
        const [h] = await window.showOpenFilePicker({ types: [{ description: 'Projekt (.json) alebo údaje linky (.csv)', accept: { 'application/json': ['.json'], 'text/csv': ['.csv'] } }] });
        const f = await h.getFile();
        openText(f.name, await f.text(), /\.json$/i.test(f.name) ? h : null);
        return;
      } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const inp = $('#openfile'); if (inp) inp.click();
  }
};
function confirmDiscard(then) {
  if ((FileIO.name && !FileIO.dirty) || isPristine()) { then(); return; }
  ui.afterDiscard = then;
  const why = FileIO.name ? `Projekt <b>${esc(FileIO.name)}</b> má zmeny, ktoré nie sú uložené v súbore.` : `Projekt <b>${esc(S.project.name)}</b> nie je uložený v súbore.`;
  modal(`<h2>Uložiť aktuálny projekt?</h2><p class="small">${why} Ak budete pokračovať bez uloženia, jeho hodnoty sa nahradia. Uložené verzie zostanú zachované.</p><div class="row"><button class="btn pri" data-act="fsavethen">Uložiť a pokračovať</button><button class="btn danger" data-act="fdiscard">Pokračovať bez uloženia</button><button class="btn" data-act="closemodal">Zrušiť</button></div>`);
}
/* Obsah otvoreného súboru: projekt JSON nahradí údaje, CSV doplní hodnoty linky */
function openText(name, text, handle) {
  if (/\.csv$/i.test(name) || /^﻿?[^{\[]/.test(text.trim().slice(0, 1))) { csvImportDialog(name, text); return; }
  let o; try { o = JSON.parse(text); } catch (e) { toast('Súbor ' + name + ' sa nedá prečítať: nie je to platný JSON.'); return; }
  confirmDiscard(() => {
    try { importState(o); FileIO.handle = handle || null; FileIO.clean(name); full(); toast('Otvorený projekt ' + name); }
    catch (e) { toast(e.message); }
  });
}
function importState(obj) {
  S = stateFromJSON(obj);
  $('#round2').checked = S.round2 !== false;
  const pn = $('#projname'); if (pn) pn.value = S.project.name;
  ui.scEdit = false; ui.kappaScen = null; ui.demExp = 0;
  save(); hideStart();
}

/* Výmena údajov s Excelom: CSV s bodkočiarkou a desatinnou čiarkou */
const csvq = (v) => { v = String(v ?? ''); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const csvn = (v, d) => (fin(v) ? fmt(v, d).replace('−', '-') : '');
function csvLineBlocks(l, row, withX) {
  const p = l.prod || {};
  row('Údaj linky', 'Hodnota');
  row('Dátum auditu', l.auditDate || ''); row('Audítor', l.auditor || '');
  row('Q – dobré kusy za zmenu [ks]', csvn(p.Q, 0)); row('N – operátori na zmenu', csvn(p.N, 0)); row('t – plánovaný čas zmeny [h]', csvn(p.t, 2));
  if (withX && (l.mode === 'direct' || !l.ind)) {
    row(''); row('Priamy vstup', 'Hodnota', 'Popis');
    DIM_KEYS.forEach(k => row(k, csvn(l.direct[k], 3), 'index dimenzie I(' + k.toLowerCase() + ')'));
    EDGE_KEYS.forEach(k => row(k, csvn(l.direct[k], 3), 'kvalita väzby q(' + EDGES[k].lab + ')'));
    ['T1', 'T5', 'P5', 'S1'].forEach(k => { const i = INDICATORS.find(x => x.c === k); row(k, csvn(l.adapt[k], 2), i.n + ' [' + i.u + ']'); });
  }
  if (l.ind) {
    const s = withX ? st(l) : null;
    row(''); row('Kód', 'Indikátor', 'Jednotka', 'x', 'x0', 'x*', 'w', withX ? 'x̃' : '');
    INDICATORS.forEach(i => { const v = l.ind[i.c]; row(i.c, i.n, i.u, withX ? csvn(v.x, 2) : '', csvn(v.x0, 2), csvn(v.xs, 2), csvn(v.w, 2), withX && s.di ? csvn(s.di.norm[i.c], 2) : ''); });
    row(''); row('Kód', 'Indikátor hrany', 'Jednotka', 'x', 'x0', 'x*', '', withX ? 'ỹ' : '');
    EDGE_IND.forEach(i => { const v = l.edge[i.c]; row(i.c, i.n, i.u, withX ? csvn(v.x, 2) : '', csvn(v.x0, 2), csvn(v.xs, 2), '', withX && s.eq ? csvn(s.eq.norm[i.c], 2) : ''); });
  }
}
function lineCSV(l) {
  const s = st(l), sm = scenSummary(l, s), n = csvn;
  const R = [], row = (...c) => R.push(c.map(csvq).join(';'));
  row('Model synergie adaptívnej montáže – výsledky linky', l.name + (l.sub ? ' (' + l.sub + ')' : '')); row('Projekt', S.project.name); if (S.project.org) row('Podnik', S.project.org); row('Dátum', stamp(Date.now())); row('');
  row('Ukazovateľ', 'Hodnota');
  row('TSI', n(s.TSI, 3)); row('Úroveň synergie', s.band.name); row('TSI′ bez väzieb', n(s.TSIp, 3)); row('Vyváženosť B', n(s.B, 2));
  row('Najslabšia hrana', s.weak ? EDGES[s.weak].lab : '');
  EDGE_KEYS.forEach(k => row('Príspevok e(' + EDGES[k].lab + ')', n(s.e[k], 3)));
  DIM_KEYS.forEach(k => row('Index I(' + k.toLowerCase() + ')', n(s.I[k], 2)));
  EDGE_KEYS.forEach(k => row('Kvalita väzby q(' + EDGES[k].lab + ')', n(s.q[k], 2)));
  row('Index adaptability A', n(s.A.A, 2)); row('Produktivita Y [ks/čh]', n(s.Y, 1));
  if (s.dem.ok) row('Hnacia dimenzia (DEMATEL)', s.dem.driver + ' (r = ' + sgn(s.dem.role[s.dem.driver].r).replace('−', '-') + ')');
  row(''); csvLineBlocks(l, row, true);
  if (s.dem.ok) { row(''); row('DEMATEL', 'R', 'C', 'd', 'r'); DIM_KEYS.forEach(k => { const p = s.dem.role[k]; row(k, n(p.R, 2), n(p.C, 2), n(p.d, 2), n(p.r, 2)); }); }
  if (sm.rows.length) {
    row(''); row('Scenár', 'Názov', 'I(t)', 'I(s)', 'I(p)', 'q(ts)', 'q(sp)', 'q(pt)', 'TSI', 'ΔTSI', 'B', 'Y', 'ΔY', 'N [tis. €]', 'η', 'A');
    row('S0', 'východiskový stav', n(s.I.T, 2), n(s.I.S, 2), n(s.I.P, 2), n(s.q.TS, 2), n(s.q.SP, 2), n(s.q.PT, 2), n(s.TSI, 3), '', n(s.B, 2), n(s.Y, 1), '', '', '', n(s.A.A, 2));
    sm.rows.forEach(r => row(r.sc.id, r.sc.name, n(r.sc.I.T, 2), n(r.sc.I.S, 2), n(r.sc.I.P, 2), n(r.sc.q.TS, 2), n(r.sc.q.SP, 2), n(r.sc.q.PT, 2), n(r.s.TSI, 3), n(r.dT, 3), n(r.s.B, 2), n(r.sc.Y, 1), n(r.dY, 1), n(r.sc.cost, 0), n(r.eta, 3), n(r.s.A.A, 2)));
  }
  if (l.plan && l.plan.length) { row(''); row('Opatrenie', 'Hrana', 'Zodpovedný', 'Termín'); l.plan.forEach(p => row(p.m, p.e, p.r, p.t)); }
  return '﻿' + R.join('\r\n') + '\r\n';
}
/* Šablóna na zber údajov: prázdny stĺpec x, referenčné a cieľové hodnoty a váhy aktívnej linky */
function templateCSV(l) {
  const base = l.ind ? l : emptyLine('tmp', l.name);
  const R = [], row = (...c) => R.push(c.map(csvq).join(';'));
  row('Model synergie adaptívnej montáže – údaje linky', (l.name || 'Nová linka') + (l.sub ? ' (' + l.sub + ')' : ''));
  row('Pokyny', 'Do stĺpca x zapíšte namerané hodnoty (desatinná čiarka). x0 je najhoršia prijateľná hodnota, x* cieľová hodnota a w váha indikátora v dimenzii; súčet váh v dimenzii je 1. Súbor uložte ako CSV oddelené bodkočiarkou a načítajte ho v aplikácii.');
  row('');
  csvLineBlocks({ ...base, prod: l.prod || base.prod }, row, false);
  row(''); row('Opatrenie', 'Hrana', 'Zodpovedný', 'Termín');
  return '﻿' + R.join('\r\n') + '\r\n';
}
function applyLineData(l, d) {
  if (d.auditDate) l.auditDate = d.auditDate;
  if (d.auditor) l.auditor = d.auditor;
  l.prod = l.prod || { Q: null, N: null, t: 7.5 };
  ['Q', 'N', 't'].forEach(k => { if (fin(d.prod[k])) l.prod[k] = d.prod[k]; });
  if (d.plan.length) l.plan = d.plan.map(p => ({ ...p, e: ['T–S', 'S–P', 'P–T'].includes(p.e) ? p.e : 'S–P' }));
  if (!d.found) {
    l.direct = l.direct || {}; l.adapt = l.adapt || {};
    for (const k in d.direct) l.direct[k] = d.direct[k];
    for (const k in d.adapt) l.adapt[k] = d.adapt[k];
    l.mode = 'direct'; return;
  }
  if (!l.ind) { const e = emptyLine('tmp', ''); l.ind = e.ind; l.edge = e.edge; }
  for (const c in d.ind) { const v = d.ind[c], t = l.ind[c]; t.x = v.x; ['x0', 'xs', 'w'].forEach(f => { if (fin(v[f])) t[f] = v[f]; }); }
  for (const c in d.edge) { const v = d.edge[c], t = l.edge[c]; t.x = v.x; ['x0', 'xs'].forEach(f => { if (fin(v[f])) t[f] = v[f]; }); }
  l.mode = 'ind';
}
function csvImportDialog(name, text) {
  let d; try { d = lineDataFromCSV(text); } catch (e) { toast(e.message); return; }
  ui.csvData = d; ui.csvName = name;
  const nm = d.name || name.replace(/\.csv$/i, '');
  modal(`<h2>Načítať údaje linky z CSV</h2><p class="small">Súbor <b>${esc(name)}</b> obsahuje ${d.found ? plural(d.found, 'hodnotu indikátora', 'hodnoty indikátorov', 'hodnôt indikátorov') : 'priamo zadané indexy dimenzií a kvalitu väzieb'}${d.plan.length ? ' a ' + plural(d.plan.length, 'opatrenie', 'opatrenia', 'opatrení') : ''}. Kam ich načítať?</p>
    <div class="row"><button class="btn pri" data-act="csvnew">Do novej linky „${esc(nm)}“</button><button class="btn" data-act="csvactive">Do aktívnej linky „${esc(line().name)}“</button><button class="btn" data-act="closemodal">Zrušiť</button></div>
    <p class="small muted">Do aktívnej linky sa prepíšu namerané hodnoty, referenčné a cieľové hodnoty, váhy, údaje Q, N, t a akčný plán (ak je v súbore).</p>`);
}

/* Pohľad Súbory a verzie */
VIEWS.ulozene = {
  t: 'Súbory a verzie', sub: 'Projekt v súbore, výmena údajov s Excelom, uložené verzie',
  html() {
    const def = line().name + ' · ' + stamp(Date.now());
    return `
    <p class="intro">Projekt obsahuje všetky linky, scenáre, matice expertov a akčné plány. Uložte ho do súboru a neskôr ho otvorte, aj na inom počítači. Namerané hodnoty môžete pripraviť v Exceli a načítať z CSV. Hodnoty sa navyše priebežne ukladajú v tomto prehliadači.</p>
    <div class="grid g2">
      <div class="card">
        <div class="card-h"><h2>Projekt</h2><span class="small muted" data-r="fstat"></span></div>
        <label class="stack" style="gap:4px" for="projname2"><span class="small muted">Názov projektu (použije sa aj ako názov súboru)</span><input class="inp wide" id="projname2" value="${esc(S.project.name)}" data-in="P:project.name" data-t="s" maxlength="80"></label>
        <div class="form"><label class="fld" for="projorg2">Podnik alebo závod<input class="inp" id="projorg2" value="${esc(S.project.org || '')}" data-in="P:project.org" data-t="s" maxlength="80"></label>
          <label class="fld" for="projaud2">Audítor alebo tím<input class="inp" id="projaud2" value="${esc(S.project.auditor || '')}" data-in="P:project.auditor" data-t="s" maxlength="80" placeholder="predvolený pre nové linky"></label></div>
        <div class="row"><button class="btn" data-act="fopen">Otvoriť súbor…</button><button class="btn pri" data-act="fsave">Uložiť</button><button class="btn" data-act="fsaveas">Uložiť ako…</button></div>
        <div class="row"><button class="btn" data-act="fnew">Nový projekt</button><button class="btn" data-act="fexamples">Pridať príklady z práce (linky X a Y)</button><button class="btn ghost" data-act="ststart">Úvodná obrazovka</button></div>
        <p class="small muted">Skratky: Ctrl + O otvorí, Ctrl + S uloží, Ctrl + Shift + S uloží ako (na Macu ⌘). ${FileIO.pickers() ? 'Prehliadač ukladá späť do otvoreného súboru.' : 'Tento prehliadač ukladá projekt ako stiahnutý súbor.'}</p>
      </div>
      <div class="card">
        <div class="card-h"><h2>Výmena údajov s Excelom</h2><span class="small muted">CSV, bodkočiarka, desatinná čiarka</span></div>
        <div class="stack">
          <div class="row"><button class="btn" data-act="csvtpl">Stiahnuť šablónu na zber údajov</button><span class="small muted">prázdny stĺpec x, referenčné hodnoty a váhy linky ${esc(line().name)}</span></div>
          <div class="row"><button class="btn" data-act="svcsv">Stiahnuť výsledky linky</button><span class="small muted">${esc(line().name)}: indexy, indikátory, DEMATEL, scenáre, akčný plán</span></div>
          <div class="row"><button class="btn" data-act="fopen">Načítať údaje z CSV…</button><span class="small muted">do novej alebo aktívnej linky</span><button class="btn ghost" data-act="imp">Vložiť obsah súboru ako text…</button></div>
        </div>
        <p class="small muted">Postup: stiahnite šablónu, v Exceli vyplňte stĺpec x, uložte ako CSV (oddelené bodkočiarkou) a načítajte. Načítať sa dá aj súbor s výsledkami.</p>
      </div>
    </div>
    <div class="grid g2">
      <div class="card">
        <div class="card-h"><h2>Uložiť verziu</h2><span data-r="where"></span></div>
        <p class="small muted">Verzia je kópia celého projektu v určitom okamihu, napríklad pred auditom a po ňom.</p>
        <label class="stack" style="gap:4px" for="svname"><span class="small muted">Názov verzie</span><input class="inp wide" id="svname" value="${esc(def)}" maxlength="120"></label>
        <label class="stack" style="gap:4px" for="svnote"><span class="small muted">Poznámka (nepovinná)</span><textarea class="inp" id="svnote" style="min-height:56px;font-family:var(--font-body);font-size:14px" maxlength="500" placeholder="Napríklad: stav pred zavedením rotácie podľa kvalifikačnej matice"></textarea></label>
        <div class="row"><button class="btn pri" data-act="svadd">Uložiť verziu</button></div>
      </div>
      <div class="card" data-r="savelist"></div>
    </div>`;
  },
  R: {
    fstat: () => FileIO.name ? esc(FileIO.name) + (FileIO.dirty ? ' · neuložené zmeny' : '') : 'zatiaľ neuložený do súboru',
    where: () => Store.mode === 'cloud' ? '<span class="pill good">vo vašom účte</span>' : '<span class="pill neu">v tomto prehliadači</span>',
    savelist() {
      const hd = `<div class="card-h"><h2>Uložené verzie</h2><span class="small muted">${Store.saves.length ? plural(Store.saves.length, 'verzia', 'verzie', 'verzií') : ''}</span></div>`;
      if (Store.loading) return hd + '<p class="small muted">Načítavam uložené verzie…</p>';
      const note = Store.note ? `<div class="note warn">${esc(Store.note)}</div>` : '';
      if (!Store.saves.length) return hd + note + '<p class="small muted">Zatiaľ nemáte uloženú žiadnu verziu.</p>';
      const btn = (act, id, lab, armed) => `<button class="btn ${armed ? 'pri' : act === 'svdel' ? 'ghost danger' : ''}" data-act="${act}" data-id="${esc(id)}">${armed ? (act === 'svdel' ? 'Naozaj odstrániť?' : 'Naozaj nahradiť?') : lab}</button>`;
      return hd + note + `<div class="tbl-wrap"><table><thead><tr><th>Verzia</th><th>Obsah</th><th></th></tr></thead><tbody>
        ${Store.saves.map(s => `<tr><td><b>${esc(s.name)}</b><div class="small muted">${esc(stamp(s.at))} · ${s.where === 'cloud' ? 'v účte' : 'v prehliadači'}</div>${s.note ? `<div class="small">${esc(s.note)}</div>` : ''}</td>
          <td class="small">${(s.summary || []).map(x => '<span style="white-space:nowrap">' + esc(x) + '</span>').join('<br>')}</td>
          <td><div class="row" style="gap:6px;justify-content:flex-end">${btn('svload', s.id, 'Načítať', ui.svArm === 'svload:' + s.id)}${btn('svdl', s.id, 'Stiahnuť')}${btn('svdel', s.id, 'Odstrániť', ui.svArm === 'svdel:' + s.id)}</div></td></tr>`).join('')}
        </tbody></table></div><p class="small muted">Načítanie verzie nahradí aktuálne hodnoty projektu.</p>`;
    }
  }
};

const arm = (key) => { ui.svArm = key; clearTimeout(arm._t); arm._t = setTimeout(() => { ui.svArm = null; if (ui.view === 'ulozene') refresh(); }, 4000); refresh(); };
async function quickSave(name, note) {
  const where = await Store.add(name || (line().name + ' · ' + stamp(Date.now())), note || '');
  if (where) toast(where === 'cloud' ? 'Verzia je uložená vo vašom účte' : 'Verzia je uložená v tomto prehliadači');
  if (ui.view === 'ulozene') refresh();
}
function newProject(meta) {
  const id = 'L1-' + Date.now().toString(36);
  S = { v: 1, project: { name: 'Nový projekt', org: '', auditor: '', ...(meta || {}) }, lineId: id, round2: true, seq: 2, lines: [emptyLine(id, 'Linka 1')], ahp: JSON.parse(JSON.stringify(AHP_EXAMPLE)), ev: {} };
  $('#round2').checked = true; const pn = $('#projname'); if (pn) pn.value = S.project.name;
  save(); FileIO.reset();
  ui.scEdit = false; ui.kappaScen = null; ui.demExp = 0;
  S.lines[0].auditor = S.project.auditor || '';
  location.hash === '#audit' ? full() : (location.hash = 'audit');
}
const SAVE_ACT = {
  fopen() { FileIO.open(); },
  fsave() { FileIO.save(false); },
  fsaveas() { FileIO.save(true); },
  async fsavethen() { closeModal(); await FileIO.save(false); const f = ui.afterDiscard; ui.afterDiscard = null; if (f && !FileIO.dirty) f(); },
  fdiscard() { closeModal(); const f = ui.afterDiscard; ui.afterDiscard = null; if (f) f(); },
  fexamples() {
    const have = new Set(S.lines.map(l => l.id));
    const add = [lineX(), lineY()].map(l => { if (have.has(l.id)) l.id = l.id + '-' + Date.now().toString(36); return l; });
    S.lines.push(...add); S.lineId = add[0].id; save(); full(); toast('Pridané linky X a Y z kapitoly 6.9');
  },
  csvtpl() { downloadFile('sablona-' + fileSafe(line().name) + '.csv', templateCSV(line()), 'text/csv'); },
  csvnew() {
    const d = ui.csvData; if (!d) return; closeModal();
    const n = S.seq++, id = 'L' + n + '-' + Date.now().toString(36), l = emptyLine(id, d.name || 'Linka ' + n);
    l.sub = d.sub || '';
    applyLineData(l, d); S.lines.push(l); S.lineId = id; save(); hideStart(); location.hash === '#audit' ? full() : (location.hash = 'audit');
    toast('Údaje načítané do novej linky ' + l.name);
  },
  csvactive() { const d = ui.csvData; if (!d) return; closeModal(); applyLineData(line(), d); save(); hideStart(); full(); toast('Údaje načítané do linky ' + line().name); },
  async svadd() { const n = ($('#svname') || {}).value, t = ($('#svnote') || {}).value; await quickSave((n || '').trim(), (t || '').trim()); const i = $('#svnote'); if (i) i.value = ''; },
  svcsv() { downloadFile('vysledky-' + fileSafe(line().name) + '-' + dayTag() + '.csv', lineCSV(line()), 'text/csv'); },
  svload(a) {
    const id = a.dataset.id;
    if (ui.svArm !== 'svload:' + id) { arm('svload:' + id); return; }
    ui.svArm = null; const r = Store.find(id); if (!r) return;
    try { importState(r.state); full(); toast('Načítaná verzia „' + r.name + '“'); } catch (e) { toast(e.message); }
  },
  svdl(a) { const r = Store.find(a.dataset.id); if (r) downloadFile(fileSafe(r.name) + '.json', projectJSON(r.state), 'application/json'); },
  async svdel(a) {
    const id = a.dataset.id;
    if (ui.svArm !== 'svdel:' + id) { arm('svdel:' + id); return; }
    ui.svArm = null; await Store.remove(id); refresh(); toast('Verzia je odstránená');
  },
  kprint() { window.print(); }
};
function readFileInput(file) {
  const r = new FileReader();
  r.onload = () => openText(file.name, String(r.result), null);
  r.readAsText(file);
}
