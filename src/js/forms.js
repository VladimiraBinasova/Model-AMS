/* ===== Formuláre: úvodná obrazovka, projekt, linka a vstupný formulár meraní ===== */

/* Ikona aplikácie: trojuholník T–S–P, vonkajší ideálny stav a profil linky so zvýraznenou najslabšou hranou */
function appIcon(size, id) {
  const g = 'ig' + (id || size);
  return `<svg class="appicon" width="${size}" height="${size}" viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a86ea"/><stop offset="1" stop-color="#1e5cb3"/></linearGradient></defs><rect width="512" height="512" rx="116" fill="url(#${g})"/><path d="M256 104 L408 368 L104 368 Z" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="16" stroke-linejoin="round"/><path d="M256 150 L364 342 L148 342 Z" fill="#fff" fill-opacity=".2"/><path d="M256 150 L364 342 M148 342 L256 150" stroke="#fff" stroke-width="22" stroke-linecap="round"/><path d="M148 342 L364 342" stroke="#ffd166" stroke-width="22" stroke-linecap="round"/><circle cx="256" cy="150" r="34" fill="#fff"/><circle cx="148" cy="342" r="34" fill="#fff"/><circle cx="364" cy="342" r="34" fill="#fff"/></svg>`;
}
const today = () => new Date().toISOString().slice(0, 10);
const START_KEY = 'ams-synergia-start';

/* Stav sa nelíši od príkladu z práce (nie je čo stratiť) */
function isPristine() { const d = defaults(); return JSON.stringify(d, (k, v) => (k === 'lineId' ? undefined : v)) === FileIO.json(); }

/* ---------- Projekt ---------- */
function projectFields(p) {
  p = p || {};
  return `<label class="fld full" for="pjname">Názov projektu *<input class="inp" id="pjname" value="${esc(p.name || '')}" maxlength="80" placeholder="napríklad Audit liniek 2027" required></label>
    <label class="fld" for="pjorg">Podnik alebo závod<input class="inp" id="pjorg" value="${esc(p.org || '')}" maxlength="80" placeholder="názov podniku, závod"></label>
    <label class="fld" for="pjaud">Audítor alebo tím<input class="inp" id="pjaud" value="${esc(p.auditor || '')}" maxlength="80" placeholder="predvyplní sa pri linkách"></label>`;
}
function openProjectModal() {
  modal(`<form id="pjform" novalidate><h2>Nový projekt</h2><div class="form">${projectFields({})}</div>
    <p class="small muted">Ďalší krok: údaje prvej linky a vstupný formulár meraní.</p>
    <p class="ferr" role="alert"></p>
    <div class="row"><button type="submit" class="btn pri">Vytvoriť projekt</button><button type="button" class="btn" data-act="closemodal">Zrušiť</button></div></form>`, 'wide');
  setTimeout(() => { const i = $('#pjname'); if (i) i.focus(); }, 30);
}
function saveProjectForm() {
  const f = $('#pjform'), name = $('#pjname').value.trim();
  if (!name) { f.querySelector('.ferr').textContent = 'Zadajte názov projektu.'; $('#pjname').focus(); return; }
  const meta = { name, org: $('#pjorg').value.trim(), auditor: $('#pjaud').value.trim() };
  const go = () => { newProject(meta); hideStart(); openLineForm(line(), { first: true }); };
  if (f.closest('#start')) confirmDiscard(go); else { closeModal(); go(); }
}

/* ---------- Úvodná obrazovka ---------- */
function startHTML() {
  const cont = ui.hadWork && !isPristine();
  const nL = S.lines.length;
  const fileInfo = FileIO.name ? 'súbor ' + FileIO.name + (FileIO.dirty ? ' · neuložené zmeny' : '') : 'zatiaľ nie je uložený v súbore';
  let skip = false; try { skip = localStorage.getItem(START_KEY) === 'skip'; } catch (e) { /* bez úložiska */ }
  return `<div class="start-in">
    <div class="start-hd">${appIcon(64, 'st')}<div><h1>Model synergie adaptívnej montáže</h1>
      <p>Audit synergie montážnych liniek: triangulačný index TSI, najslabšia väzba medzi technikou, ľuďmi a organizáciou, DEMATEL, scenáre opatrení a karta synergie s akčným plánom.</p></div></div>
    <div class="start-grid">
      <form id="pjform" class="card" novalidate>
        <h2>Nový projekt</h2>
        <div class="form">${projectFields({ auditor: S.project && S.project.auditor })}</div>
        <p class="ferr" role="alert"></p>
        <div class="row"><button type="submit" class="btn pri">Vytvoriť projekt</button><span class="small muted">potom údaje linky a vstupný formulár meraní</span></div>
      </form>
      <div class="stack" style="gap:10px">
        ${cont ? `<button class="startopt pri" data-act="stcont"><b>Pokračovať v projekte ${esc(S.project.name)}</b><small>${plural(nL, 'linka', 'linky', 'liniek')} · ${esc(fileInfo)}</small></button>` : ''}
        <button class="startopt" data-act="stopen"><b>Otvoriť súbor…</b><small>projekt (.json) alebo údaje linky z Excelu (.csv)</small></button>
        <button class="startopt" data-act="stexample"><b>Pozrieť príklad z práce</b><small>linky X a Y z kapitoly 6.9 s výsledkami, scenármi a kartou synergie</small></button>
        <ol class="howto"><li><b>Projekt:</b> názov, podnik, audítor</li><li><b>Linka:</b> názov, dátum auditu, údaje zmeny</li><li><b>Vstupný formulár:</b> 15 indikátorov dimenzií a 6 indikátorov väzieb</li><li><b>Výsledok:</b> TSI, najslabšia hrana, scenáre a karta synergie</li></ol>
      </div>
    </div>
    <label class="small muted row" style="gap:8px" for="stskip"><input type="checkbox" id="stskip" ${skip ? 'checked' : ''}> Pri spustení otvoriť rovno posledný projekt</label>
  </div>`;
}
function showStart() { const el = $('#start'); el.innerHTML = startHTML(); el.hidden = false; document.body.classList.add('starting'); setTimeout(() => { const b = el.querySelector('[data-act=stcont]') || $('#pjname'); if (b) b.focus(); }, 30); }
function hideStart() { const el = $('#start'); if (!el || el.hidden) return; el.hidden = true; el.innerHTML = ''; document.body.classList.remove('starting'); }
function initStart() {
  let skip = false; try { skip = localStorage.getItem(START_KEY) === 'skip'; } catch (e) { /* bez úložiska */ }
  if (!skip) showStart();
}

/* ---------- Linka: nová alebo úprava údajov ---------- */
function lineForm(l, o) {
  const isNew = !l || (o && o.first), first = o && o.first;
  const v = l && !first ? l : { name: first && l ? l.name : 'Linka ' + (S.lines.length + 1), sub: '', auditDate: today(), auditor: S.project.auditor || '', prod: (l && l.prod) || { Q: null, N: null, t: 7.5 } };
  const p = v.prod || {};
  return `<form id="nlform" novalidate>
    <h2>${first ? 'Prvá linka projektu' : isNew ? 'Nová linka' : 'Údaje linky ' + esc(l.name)}</h2>
    <div class="form">
      <label class="fld full" for="nlname">Názov linky *<input class="inp" id="nlname" value="${esc(v.name)}" maxlength="60" required placeholder="napríklad Linka 3 – montáž dverí"></label>
      <label class="fld full" for="nlsub">Popis<input class="inp" id="nlsub" value="${esc(v.sub || '')}" maxlength="80" placeholder="typ linky, výrobok alebo pracovisko, napríklad ručne mechanizovaná"></label>
      <label class="fld" for="nldate">Dátum auditu<input class="inp" type="date" id="nldate" value="${esc(v.auditDate || '')}"></label>
      <label class="fld" for="nlaud">Audítor alebo tím<input class="inp" id="nlaud" value="${esc(v.auditor || '')}" maxlength="80" placeholder="meno, oddelenie"></label>
      <div class="fld full"><span>Údaje zmeny pre produktivitu Y = Q / (N · t)</span>
        <div class="form3">
          <label class="fld" for="nlQ">Q – dobré kusy za zmenu<input class="inp" id="nlQ" inputmode="decimal" value="${iv(p.Q)}" placeholder="ks"></label>
          <label class="fld" for="nlN">N – operátori na zmenu<input class="inp" id="nlN" inputmode="decimal" value="${iv(p.N)}" placeholder="počet, bez tímlídra"></label>
          <label class="fld" for="nlt">t – plánovaný čas zmeny<input class="inp" id="nlt" inputmode="decimal" value="${iv(p.t)}" placeholder="h"></label>
        </div>
      </div>
      ${isNew ? `<div class="fld full"><span>Spôsob zadania</span><div class="row">
        <label class="row" style="gap:6px"><input type="radio" name="nlmode" value="ind" checked> 15 indikátorov a 6 hrán (odporúčané)</label>
        <label class="row" style="gap:6px"><input type="radio" name="nlmode" value="direct"> priamo indexy dimenzií a kvalita väzieb</label></div></div>
      <p class="small muted full">Po vytvorení linky sa otvorí vstupný formulár meraní. Referenčné hodnoty x₀, cieľové hodnoty x* a váhy indikátorov sú predvolené podľa kapitoly 6; v audite ich môžete zmeniť. Pri porovnávaných linkách ich nechajte rovnaké.</p>` : ''}
    </div>
    <p class="ferr" id="nlerr" role="alert"></p>
    <div class="row"><button type="submit" class="btn pri">${isNew ? 'Pokračovať na merania' : 'Uložiť zmeny'}</button><button type="button" class="btn" data-act="closemodal">${first ? 'Neskôr' : 'Zrušiť'}</button></div>
  </form>`;
}
function openLineForm(l, o) {
  ui.lineForm = l ? l.id : null; ui.lineFirst = !!(o && o.first);
  modal(lineForm(l, o), 'wide');
  setTimeout(() => { const i = $('#nlname'); if (i) { i.focus(); i.select(); } }, 30);
}
function saveLineForm() {
  const err = (m, id) => { $('#nlerr').textContent = m; if (id) $(id).focus(); };
  const name = $('#nlname').value.trim();
  if (!name) return err('Zadajte názov linky.', '#nlname');
  const num = {};
  for (const [k, id] of [['Q', '#nlQ'], ['N', '#nlN'], ['t', '#nlt']]) {
    const raw = $(id).value.trim(), x = pnum(raw);
    if (raw && (!fin(x) || x < 0)) return err(`Hodnota ${k} musí byť nezáporné číslo.`, id);
    num[k] = raw ? x : null;
  }
  const meta = { name, sub: $('#nlsub').value.trim(), auditDate: $('#nldate').value || '', auditor: $('#nlaud').value.trim() };
  const mode = (($('input[name=nlmode]:checked') || {}).value) === 'direct' ? 'direct' : 'ind';
  const editing = ui.lineForm && S.lines.find(x => x.id === ui.lineForm);
  if (editing && !ui.lineFirst) {
    Object.assign(editing, meta); editing.prod = { ...(editing.prod || {}), ...num };
    closeModal(); full(); toast('Údaje linky sú uložené'); return;
  }
  let l = editing;
  if (!l) { const id = 'L' + (S.seq++) + '-' + Date.now().toString(36); l = emptyLine(id, name); S.lines.push(l); }
  Object.assign(l, meta); l.prod = num; l.mode = mode;
  S.lineId = l.id; ui.kappaScen = null; ui.demExp = 0;
  location.hash === '#audit' ? full() : (location.hash = 'audit');
  openWizard(0);
}

/* ---------- Vstupný formulár meraní (po krokoch) ---------- */
function wzSteps(l) {
  const ind = l.mode === 'ind' && l.ind;
  const prod = { k: 'Y', t: 'Produktivita zmeny', sub: 'Y = Q / (N · t), vzťah (6.19)', fields: [
    { c: 'Q', n: 'Dobré kusy za zmenu', m: 'Počet zhodných výrobkov za zmenu', u: 'ks', path: 'prod.Q' },
    { c: 'N', n: 'Operátori na zmenu', m: 'Započítavajú sa iba operátori, nie tímlíder', u: 'osôb', path: 'prod.N' },
    { c: 't', n: 'Plánovaný čas zmeny', m: 'Čistý plánovaný čas zmeny', u: 'h', path: 'prod.t' }] };
  const sum = { k: 'R', t: 'Súhrn', sub: 'výsledok auditu linky' };
  if (ind) return [
    ...DIM_KEYS.map(k => ({ k, t: DIMS[k].name + ' dimenzia', sub: DIMS[k].short, fields: INDICATORS.filter(i => i.d === k).map(i => ({ ...i, path: 'ind.' + i.c + '.x', ref: l.ind[i.c] })) })),
    { k: 'E', t: 'Väzby medzi dimenziami', sub: 'dva indikátory pre každú hranu T–S, S–P a P–T', fields: EDGE_IND.map(i => ({ ...i, dir: 1, path: 'edge.' + i.c + '.x', ref: l.edge[i.c], e: i.e })) },
    prod, sum];
  return [
    { k: 'D', t: 'Indexy dimenzií a kvalita väzieb', sub: 'hodnoty v intervale 0 až 1 (napríklad z predchádzajúceho auditu)', fields: [
      ...DIM_KEYS.map(k => ({ c: k, n: 'Index ' + DIMS[k].gen + ' dimenzie I(' + k.toLowerCase() + ')', u: '0–1', path: 'direct.' + k, unit01: true })),
      ...EDGE_KEYS.map(k => ({ c: k, n: 'Kvalita väzby q(' + EDGES[k].lab + ')', m: EDGES[k].name, u: '0–1', path: 'direct.' + k, unit01: true }))] },
    { k: 'A', t: 'Adaptabilita', sub: 'štyri indikátory indexu adaptability A, vzťah (6.21)', fields: ['T1', 'T5', 'P5', 'S1'].map(c => { const i = INDICATORS.find(x => x.c === c); return { ...i, path: 'adapt.' + c, ref: { x0: ADAPT_REF[c][0], xs: ADAPT_REF[c][1] } }; }) },
    prod, sum];
}
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function wzFieldNote(f, v) {
  if (f.unit01) {
    if (v == null) return '<span class="muted">zadajte hodnotu 0 až 1</span>';
    return v < 0 || v > 1 ? '<span class="bad-t">hodnota musí byť v intervale 0 až 1</span>' : `<span class="nbar"><i style="width:${v * 100}%"></i></span>`;
  }
  if (!f.ref) return '';
  const { x0, xs } = f.ref, dirTxt = (fin(x0) && fin(xs) ? (xs > x0 ? 'vyšší = lepší' : 'nižší = lepší') : '');
  const refTxt = `x₀ = ${iv(x0)} · x* = ${iv(xs)} ${esc(f.u)} · ${dirTxt}`;
  if (v == null) return `<span class="muted">${refTxt}</span>`;
  const raw = normRaw(v, x0, xs), n = normalize(v, x0, xs);
  if (n == null) return `<span class="bad-t">referenčná a cieľová hodnota sú rovnaké</span>`;
  const pctBad = f.u === '%' && (v < 0 || v > 100);
  const warn = pctBad ? '<span class="bad-t">percento mimo 0 až 100</span>' : raw < 0 ? '<span class="warn-t">horšie ako x₀, počíta sa ako 0</span>' : raw > 1 ? '<span class="warn-t">lepšie ako x*, počíta sa ako 1</span>' : '';
  return `<span class="nbar"><i style="width:${n * 100}%"></i></span><b class="mono">x̃ = ${fmt(n)}</b> ${warn}<span class="muted"> · ${refTxt}</span>`;
}
function wzStepDone(l, st) { return st.fields ? st.fields.filter(f => fin(getPath(l, f.path))).length : 0; }
function wzHTML() {
  const l = line(), steps = wzSteps(l), i = Math.min(ui.wz || 0, steps.length - 1), stp = steps[i];
  const nav = steps.map((s, k) => { const n = s.fields ? s.fields.length : 0, d = wzStepDone(l, s), ok = s.fields && d === n;
    return `<button type="button" class="wzs ${k === i ? 'on' : ''} ${ok ? 'ok' : ''}" data-act="wzgo" data-v="${k}"><span class="wzn">${ok ? '✓' : k + 1}</span><span>${esc(s.k === 'R' ? 'Súhrn' : s.k === 'E' ? 'Väzby' : s.k === 'Y' ? 'Zmena' : s.k === 'D' ? 'Indexy' : s.k === 'A' ? 'Adaptabilita' : DIMS[s.k].name)}${s.fields ? `<small>${d}/${n}</small>` : ''}</span></button>`; }).join('');
  let body;
  if (stp.k === 'R') body = wzSummary(l, steps);
  else body = stp.fields.map((f, k) => { const v = getPath(l, f.path);
    return `<div class="wzf"><label class="wzl" for="wz-${f.c}"><b>${esc(f.c)}</b> ${esc(f.n)}${f.m || f.f ? `<small>${esc([f.m, f.f].filter(Boolean).join(' · '))}</small>` : ''}</label>
      <div class="wzi"><input class="inp" id="wz-${f.c}" inputmode="decimal" autocomplete="off" value="${iv(v)}" data-wz="${f.path}" data-k="${k}"><span class="muted">${esc(f.u)}</span></div>
      <div class="wzr" data-wzr="${k}">${wzFieldNote(f, fin(v) ? v : null)}</div></div>`; }).join('')
    + (stp.k === 'Y' ? `<div class="formula" data-wzy>${wzY(l)}</div>` : '');
  const last = i === steps.length - 1;
  return `<div class="wz">
    <div class="wz-h"><div><h2>Vstupný formulár · ${esc(l.name)}</h2><span class="small muted">${esc(stp.t)}${stp.sub ? ' · ' + esc(stp.sub) : ''}</span></div><button type="button" class="btn ghost" data-act="closemodal" aria-label="Zavrieť">Zavrieť</button></div>
    <nav class="wz-nav" aria-label="Kroky formulára">${nav}</nav>
    <div class="wz-b">${body}</div>
    <div class="wz-f"><span class="small muted">Hodnoty sa ukladajú priebežne. Enter presunie na ďalšie pole.</span><div class="row">
      ${i > 0 ? '<button type="button" class="btn" data-act="wzprev">Späť</button>' : ''}
      ${last ? '<button type="button" class="btn" data-act="wzcard">Karta synergie</button><button type="button" class="btn pri" data-act="closemodal">Zobraziť audit linky</button>' : `<button type="button" class="btn pri" data-act="wznext">${i === steps.length - 2 ? 'Zobraziť súhrn' : 'Ďalej'}</button>`}
    </div></div></div>`;
}
function wzY(l) { const p = l.prod || {}; const y = st(l).Y; return `Y = ${iv(p.Q) || '?'} / (${iv(p.N) || '?'} · ${iv(p.t) || '?'}) = <b>${fmt(y, 1)}</b> ks/človekohodina`; }
function wzSummary(l, steps) {
  const s = st(l);
  if (!s.complete) {
    const miss = steps.filter(x => x.fields && x.k !== 'Y').map((x, k) => ({ x, k: steps.indexOf(x), list: x.fields.filter(f => !fin(getPath(l, f.path))).map(f => f.c) })).filter(m => m.list.length);
    return `<div class="note warn">Chýba ${plural(s.missing, 'hodnota', 'hodnoty', 'hodnôt')}. TSI, najslabšiu hranu a diagnostiku aplikácia vypočíta, keď budú zadané všetky.</div>
      <div class="stack" style="gap:8px">${miss.map(m => `<div class="row"><button type="button" class="btn" data-act="wzgo" data-v="${m.k}">${esc(m.x.t)}</button><span class="small muted">chýba ${m.list.join(', ')}</span></div>`).join('')}</div>
      <p class="small muted">Formulár môžete zavrieť a doplniť ho neskôr tlačidlom Vstupný formulár v Audite linky.</p>`;
  }
  return `<div class="grid g4">${tilesHTML(s)}</div>
    <div class="grid g2" style="align-items:start"><div>${radar(s.I, null)}</div><div class="stack" style="gap:8px"><h3>Príspevky hrán</h3>${edgeBars(s.e, s.weak)}
    <p class="small">Produktivita Y = <b>${fmt(s.Y, 1)} ks/čh</b> · index adaptability A = <b>${fmt(s.A.A)}</b></p>
    <p class="small muted">Opatrenia smerujte na hranu ${EDGES[s.weak].lab}. Diagnostiku nájdete v Audite linky, akčný plán na Karte synergie.</p></div></div>`;
}
function openWizard(step) { ui.wz = step || 0; modal(wzHTML(), 'wide wzm'); setTimeout(() => { const i = $('.wz-b input'); if (i) i.focus(); }, 30); }
function wzRender(focus) { const m = $('#modal'); if (!m.classList.contains('on') || !$('.wz')) return; m.firstElementChild.innerHTML = wzHTML(); m.firstElementChild.scrollTop = 0; if (focus) setTimeout(() => { const i = $('.wz-b input'); if (i) i.focus(); }, 20); }
function wzInput(el) {
  const l = line(), raw = el.value.trim(), x = pnum(raw);
  const val = raw === '' ? null : fin(x) ? x : null;
  el.classList.toggle('bad', raw !== '' && !fin(x));
  setPath(l, el.dataset.wz, val);
  const steps = wzSteps(l), stp = steps[Math.min(ui.wz || 0, steps.length - 1)], f = stp.fields[+el.dataset.k];
  const r = document.querySelector(`[data-wzr="${el.dataset.k}"]`); if (r) r.innerHTML = wzFieldNote(f, val);
  const y = document.querySelector('[data-wzy]'); if (y) y.innerHTML = wzY(l);
  const nav = $$('.wz-nav .wzs');
  steps.forEach((s, k) => { if (!s.fields || !nav[k]) return; const d = wzStepDone(l, s), ok = d === s.fields.length; nav[k].classList.toggle('ok', ok); nav[k].querySelector('.wzn').textContent = ok ? '✓' : k + 1; const sm = nav[k].querySelector('small'); if (sm) sm.textContent = d + '/' + s.fields.length; });
  save(); if (ui.view !== 'metodika') refresh();
}
function wzEnter(el) {
  const ins = $$('.wz-b input'), k = ins.indexOf(el);
  if (k >= 0 && k < ins.length - 1) { ins[k + 1].focus(); ins[k + 1].select(); } else FORM_ACT.wznext();
}

const FORM_ACT = {
  newline() { openLineForm(null); },
  editline() { openLineForm(line()); },
  wzopen(a) { openWizard(a && a.dataset.v ? +a.dataset.v : 0); },
  wzgo(a) { ui.wz = +a.dataset.v; wzRender(true); },
  wznext() { const n = wzSteps(line()).length; ui.wz = Math.min(n - 1, (ui.wz || 0) + 1); wzRender(true); },
  wzprev() { ui.wz = Math.max(0, (ui.wz || 0) - 1); wzRender(true); },
  wzcard() { closeModal(); location.hash = 'karta'; },
  stcont() { hideStart(); },
  stopen() { FileIO.open(); },
  stexample() {
    const go = () => { S = defaults(); $('#round2').checked = true; const pn = $('#projname'); if (pn) pn.value = S.project.name; save(); FileIO.reset(); hideStart(); location.hash === '#audit' ? full() : (location.hash = 'audit'); };
    if (isPristine()) { hideStart(); full(); } else confirmDiscard(go);
  },
  ststart() { showStart(); },
  fnew() { confirmDiscard(() => openProjectModal()); }
};
