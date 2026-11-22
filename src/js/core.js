/* ===== Stav, pomocné funkcie, grafy ===== */
const STORE_KEY = 'ams-synergia-v1';
const ui = { view: 'audit', modelSel: 'C', selInd: 'T1', demExp: 0, ahpDim: 'T', scSel: 'S4', scEdit: false, stepSel: 1, cycSel: 2, kappaScen: null, resetArm: false };
let S;

function defaults() {
  return { v: 1, project: { name: 'Príklad z práce – linky X a Y' }, lineId: 'X', round2: true, seq: 1, lines: [lineX(), lineY()], ahp: JSON.parse(JSON.stringify(AHP_EXAMPLE)), ev: {} };
}
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1 && Array.isArray(o.lines) && o.lines.length) { const st0 = stateFromJSON(o); ui.hadWork = true; return st0; } } } catch (e) { /* bez úložiska */ }
  return defaults();
}
function save() {
  let ok = true;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { ok = false; }
  const el = document.getElementById('autosave');
  if (el) el.textContent = ok ? 'Pracovná kópia v prehliadači · ' + new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) : 'Pracovnú kópiu tu nemožno uložiť v prehliadači. Uložte projekt do súboru.';
  if (typeof FileIO !== 'undefined') FileIO.check();
}

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const fin = v => typeof v === 'number' && Number.isFinite(v);
const fmt = (v, d = 2) => { if (!fin(v)) return '—'; const r = rnd(v, d); return (r < 0 ? '−' : '') + Math.abs(r).toFixed(d).replace('.', ','); };
const sgn = (v, d = 2) => { if (!fin(v)) return '—'; const r = rnd(v, d); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r).toFixed(d).replace('.', ','); };
const pct = (v, d = 0) => fmt(v * 100, d) + ' %';
const fdate = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? `${+m[3]}. ${+m[2]}. ${m[1]}` : ''; };
/* Popis auditu linky: dátum a audítor, ak sú zadané */
function auditMeta(l) { return [l.auditDate ? 'audit ' + fdate(l.auditDate) : '', l.auditor ? 'audítor ' + l.auditor : ''].filter(Boolean).join(' · '); }
const iv = v => fin(v) ? String(v).replace('.', ',') : '';
function pnum(s) { if (s == null) return NaN; s = String(s).trim().replace(/\s/g, '').replace(',', '.').replace('−', '-'); return s === '' ? NaN : Number(s); }
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const line = () => S.lines.find(l => l.id === S.lineId) || S.lines[0];
const saatyLab = v => v >= 1 ? String(Math.round(v)) : '1/' + Math.round(1 / v);
const elab = k => EDGES[k] ? EDGES[k].lab : k;

/* Stav linky – kompletný výpočet modelu */
const INCOMPLETE = { name: 'Neúplné údaje', cls: 'neu', ch: 'Chýbajú niektoré hodnoty indikátorov alebo indexov', rec: 'Doplňte chýbajúce hodnoty' };
function st(l) {
  l = l || line();
  let I, q, di = null, eq = null, missing = 0;
  if (l.mode === 'ind' && l.ind) {
    di = dimIndices(l); eq = edgeQualities(l); I = { ...di.I }; q = { ...eq.q };
    missing = DIM_KEYS.reduce((a, k) => a + di.missing[k], 0) + eq.missing;
  } else {
    I = { T: l.direct.T, S: l.direct.S, P: l.direct.P }; q = { TS: l.direct.TS, SP: l.direct.SP, PT: l.direct.PT };
    missing = [...DIM_KEYS.map(k => I[k]), ...EDGE_KEYS.map(k => q[k])].filter(v => !fin(v)).length;
  }
  DIM_KEYS.forEach(k => { I[k] = fin(I[k]) ? (S.round2 ? r2(I[k]) : I[k]) : NaN; });
  EDGE_KEYS.forEach(k => { q[k] = fin(q[k]) ? (S.round2 ? r2(q[k]) : q[k]) : NaN; });
  const complete = missing === 0;
  const syn = synergy(I, q);
  if (!complete) {
    const allI = DIM_KEYS.every(k => fin(I[k]));
    Object.assign(syn, { TSI: NaN, TSIp: allI ? syn.TSIp : NaN, B: allI ? syn.B : NaN, weak: null, second: null, close: false, order: [] });
    EDGE_KEYS.forEach(k => { if (!fin(syn.e[k])) syn.e[k] = NaN; });
  }
  let A;
  if (l.mode === 'ind' && l.ind) {
    const v = {}, refs = {};
    ['T1', 'T5', 'P5', 'S1'].forEach(k => { v[k] = l.ind[k].x; refs[k] = [l.ind[k].x0, l.ind[k].xs]; });
    A = adaptIndex(v, refs);
  } else A = adaptIndex(l.adapt, ADAPT_REF);
  const p = l.prod || {}, Y = fin(p.Q) && fin(p.N) && fin(p.t) && p.N > 0 && p.t > 0 ? p.Q / (p.N * p.t) : NaN;
  const dem = dematel(l.dem);
  return { I, q, ...syn, A, Y, dem, di, eq, complete, missing, band: complete ? bandOf(syn.TSI) : INCOMPLETE };
}

/* Pravidlo kroku 5 (kap. 6.8.5) */
function advice(s) {
  if (!s.complete) return { txt: 'Chýba ' + s.missing + ' ' + (s.missing === 1 ? 'hodnota' : s.missing < 5 ? 'hodnoty' : 'hodnôt') + '. Najslabšiu hranu a odporúčanie aplikácia určí, keď budú zadané všetky indikátory dimenzií a hrán.', kind: 'warn' };
  const E = EDGES[s.weak];
  const parts = [];
  if (!s.dem.ok) return { txt: 'Matica DEMATEL je prázdna, hnaciu a závislú dimenziu nemožno určiť.', kind: 'warn' };
  const ra = s.dem.role[E.a].r, rb = s.dem.role[E.b].r;
  const third = DIM_KEYS.find(k => k !== E.a && k !== E.b);
  let kind = 'acc';
  if (ra > 0 && rb < 0 || ra < 0 && rb > 0) {
    const drv = ra > 0 ? E.a : E.b, dep = ra > 0 ? E.b : E.a;
    parts.push(`Najslabšia hrana <b>${E.lab}</b> spája hnaciu dimenziu <b>${drv}</b> (r = ${sgn(s.dem.role[drv].r)}) a závislú dimenziu <b>${dep}</b> (r = ${sgn(s.dem.role[dep].r)}). Opatrenia smerujte prednostne cez hnaciu dimenziu ${drv}, ktorá dimenziu ${dep} ovplyvňuje.`);
  } else if (ra > 0 && rb > 0) {
    parts.push(`Najslabšia hrana <b>${E.lab}</b> spája dve hnacie dimenzie (r = ${sgn(ra)} a ${sgn(rb)}). Opatrenia smerujte na hranu ako celok; závislú dimenziu ${third} zlepšíte sprostredkovane, prenosom zlepšenia z hnacích dimenzií.`);
  } else {
    kind = 'warn';
    parts.push(`Obe dimenzie najslabšej hrany <b>${E.lab}</b> sú závislé. Pravidlo kroku 5 tento prípad priamo nerieši; zvážte zásah cez hnaciu dimenziu ${third} (r = ${sgn(s.dem.role[third].r)}).`);
  }
  parts.push(`Typické nástroje hrany ${E.lab}: ${E.tools}.`);
  return { txt: parts.join(' '), kind };
}

/* ---------- SVG grafy ---------- */
function radar(I, I2, o = {}) {
  const W = 400, H = 330, cx = 200, cy = 182, R = 118;
  const ang = { T: -90, P: 30, S: 150 };
  const pt = (k, v) => { const a = ang[k] * Math.PI / 180; return [cx + R * v * Math.cos(a), cy + R * v * Math.sin(a)]; };
  const poly = (vals) => DIM_KEYS.map(k => pt(k, fin(vals[k]) ? Math.max(0, Math.min(1, vals[k])) : 0).map(n => n.toFixed(1)).join(',')).join(' ');
  let g = '';
  [0.25, 0.5, 0.75, 1].forEach(lv => { g += `<polygon points="${poly({ T: lv, S: lv, P: lv })}" fill="none" class="ax" stroke-width="1"/>`; });
  DIM_KEYS.forEach(k => { const [x, y] = pt(k, 1); g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="ax"/>`; });
  g += `<text x="${cx + 7}" y="${cy - R * 0.5 + 13}" font-size="10" class="mt">0,5</text><text x="${cx + 7}" y="${cy - R + 15}" font-size="10" class="mt">1,0</text>`;
  if (I2) g += `<polygon points="${poly(I2)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>` + DIM_KEYS.filter(k => fin(I2[k])).map(k => { const [x, y] = pt(k, I2[k]); return `<circle cx="${x}" cy="${y}" r="4" fill="var(--muted)"/>`; }).join('');
  g += `<polygon points="${poly(I)}" fill="var(--accent)" fill-opacity=".14" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round"/>`;
  g += DIM_KEYS.filter(k => fin(I[k])).map(k => { const [x, y] = pt(k, I[k]); return `<circle cx="${x}" cy="${y}" r="5" fill="var(--accent)"/>`; }).join('');
  const lab = (k, x, y, anchor) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="14" font-weight="600">${DIMS[k].name}</text>` +
    `<text x="${x}" y="${y + 17}" text-anchor="${anchor}" font-size="13" class="mt">${fmt(I[k])}${I2 ? ' → ' + fmt(I2[k]) : ''}</text>`;
  g += lab('T', cx, 30, 'middle') + lab('S', 96, cy + R * 0.5 + 40, 'middle') + lab('P', 304, cy + R * 0.5 + 40, 'middle');
  let leg = '';
  if (o.legend) leg = `<div class="row small muted" style="gap:18px"><span><svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="var(--accent)" stroke-width="3"/></svg> ${o.legend[0]}</span>${I2 ? `<span><svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="var(--muted)" stroke-width="2.4" stroke-dasharray="5 4"/></svg> ${o.legend[1]}</span>` : ''}</div>`;
  return `<div class="stack" style="gap:6px"><svg class="svgbox" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trojuholník synergie" style="max-width:460px;margin:0 auto">${g}</svg>${leg}</div>`;
}

function edgeBars(e, weak, e2) {
  const mx = Math.max(0.3, ...EDGE_KEYS.map(k => e[k]).filter(fin), ...(e2 ? EDGE_KEYS.map(k => e2[k]).filter(fin) : [0])) * 1.08;
  return `<div class="stack" style="gap:8px">` + EDGE_KEYS.map(k => {
    const w = fin(e[k]) ? 100 * e[k] / mx : 0, isW = k === weak;
    const bar2 = e2 ? `<div style="height:6px;margin-top:3px;width:${(fin(e2[k]) ? 100 * e2[k] / mx : 0).toFixed(1)}%;border-radius:3px;background:var(--muted);opacity:.45"></div>` : '';
    return `<div style="display:grid;grid-template-columns:40px 1fr ${e2 ? '118px' : '52px'};gap:10px;align-items:center">
      <b style="font-family:var(--font-display)">${EDGES[k].lab}</b>
      <div><div style="height:16px;width:${w.toFixed(1)}%;border-radius:4px;background:${isW ? 'var(--accent)' : 'var(--line)'}"></div>${bar2}</div>
      <span class="r num" style="text-align:right;${isW ? 'font-weight:700' : ''}">${fmt(e[k], 3)}${e2 ? ` → ${fmt(e2[k], 3)}` : ''}</span></div>`;
  }).join('') + `</div>`;
}

function scaleStrip(markers) {
  const W = 1000, x0 = 10, w = W - 20, X = v => x0 + w * Math.max(0, Math.min(1, v));
  let g = BANDS.map(b => `<rect x="${X(b.lo)}" y="34" width="${X(Math.min(1, b.hi)) - X(b.lo)}" height="26" fill="var(--${b.cls})"/><text x="${(X(b.lo) + X(Math.min(1, b.hi))) / 2}" y="51" text-anchor="middle" font-size="12" font-weight="600">${b.name}</text>`).join('');
  g += [0, .25, .5, .75, 1].map(v => `<text x="${X(v)}" y="76" text-anchor="${v === 0 ? 'start' : v === 1 ? 'end' : 'middle'}" font-size="11" class="mt">${fmt(v)}</text>`).join('');
  /* Popisy značiek sa ukladajú do riadkov nad sebou, aby sa neprekrývali; aktívna linka je v najnižšom riadku */
  const rows = [], placed = [];
  [...markers].sort((a, b) => (a.dim ? 1 : 0) - (b.dim ? 1 : 0) || a.v - b.v).forEach(m => {
    const x = X(m.v), tw = String(m.lab).length * 6.8 + 10;
    const anch = x < 80 ? 'start' : x > W - 80 ? 'end' : 'middle';
    const a = anch === 'start' ? x : anch === 'end' ? x - tw : x - tw / 2;
    let r = rows.findIndex(rw => rw.every(([s, e]) => a + tw <= s || a >= e));
    if (r < 0) { rows.push([]); r = rows.length - 1; }
    rows[r].push([a, a + tw]); placed.push({ m, x, anch, r });
  });
  const lh = 14, top = Math.max(0, rows.length - 1) * lh;
  placed.slice().reverse().forEach(({ m, x }) => { g += `<path d="M${x - 6},23 L${x + 6},23 L${x},32 Z" style="fill:${m.dim ? 'var(--muted)' : 'var(--accent)'}"/>`; });
  placed.forEach(({ m, x, anch, r }) => { g += `<text x="${x}" y="${19 - r * lh}" text-anchor="${anch}" font-size="12" font-weight="600" style="fill:${m.dim ? 'var(--muted)' : 'var(--accent)'}">${esc(m.lab)}</text>`; });
  return `<svg class="svgbox" viewBox="0 ${-8 - top} ${W} ${90 + top}" role="img" aria-label="Škála TSI">${g}</svg>`;
}

function vbars(items, o = {}) { /* items: {lab, v, col, txt} */
  const W = o.w || 560, H = o.h || 220, pl = 40, pb = 28, pt = 18, raw = o.max || Math.max(...items.map(i => Math.abs(i.v || 0)), 0.001) * 1.12;
  const mag = 10 ** Math.floor(Math.log10(raw / 4)), stp = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s * 4 >= raw), mx = stp * 4;
  const ch = H - pb - pt, bw = Math.min(54, (W - pl - 10) / items.length * 0.62), step = (W - pl - 10) / items.length;
  const Y = v => pt + ch - ch * v / mx;
  let g = '';
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) { const v = mx / ticks * i; g += `<line x1="${pl}" x2="${W - 6}" y1="${Y(v)}" y2="${Y(v)}" class="ax" stroke-dasharray="${i ? '2 4' : ''}"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10" class="mt">${fmt(v, o.dt ?? 2)}</text>`; }
  items.forEach((it, i) => {
    const x = pl + step * i + (step - bw) / 2, v = it.v;
    if (fin(v)) { g += `<rect x="${x}" y="${Y(Math.max(0, v))}" width="${bw}" height="${Math.abs(Y(v) - Y(0))}" rx="3" style="fill:${it.col || 'var(--accent)'}"/>`; g += `<text x="${x + bw / 2}" y="${Y(Math.max(0, v)) - 5}" text-anchor="middle" font-size="11" font-weight="600">${it.txt ?? fmt(v, o.d ?? 3)}</text>`; }
    else g += `<text x="${x + bw / 2}" y="${Y(0) - 6}" text-anchor="middle" font-size="11" class="mt">n/a</text>`;
    g += `<text x="${x + bw / 2}" y="${H - 9}" text-anchor="middle" font-size="12" font-weight="${it.bold ? 700 : 500}">${esc(it.lab)}</text>`;
  });
  return `<svg class="svgbox" viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
}

function normChart(x, x0, xs, u) {
  const W = 340, H = 170, pl = 34, pr = 14, pt = 12, pb = 34;
  if (![x0, xs].every(fin) || x0 === xs) return '<p class="muted small">Referenčná a cieľová hodnota musia byť rôzne čísla.</p>';
  const vals = [x0, xs].concat(fin(x) ? [x] : []);
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.18 || 1; lo -= pad; hi += pad;
  const X = v => pl + (W - pl - pr) * (v - lo) / (hi - lo), Y = v => pt + (H - pt - pb) * (1 - v);
  const f = v => clip01((v - x0) / (xs - x0));
  let g = `<line x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}" class="ax"/><line x1="${pl}" x2="${W - pr}" y1="${Y(1)}" y2="${Y(1)}" class="ax" stroke-dasharray="3 4"/>`;
  g += `<text x="${pl - 6}" y="${Y(0) + 4}" text-anchor="end" font-size="10" class="mt">0</text><text x="${pl - 6}" y="${Y(1) + 4}" text-anchor="end" font-size="10" class="mt">1</text>`;
  const pts = [lo, Math.min(x0, xs), Math.max(x0, xs), hi].map(v => `${X(v).toFixed(1)},${Y(f(v)).toFixed(1)}`).join(' ');
  g += `<polyline points="${pts}" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
  g += `<line x1="${X(x0)}" x2="${X(x0)}" y1="${Y(0)}" y2="${H - pb + 4}" class="ax"/><text x="${X(x0)}" y="${H - 8}" text-anchor="middle" font-size="11" class="mt">x₀ = ${fmt(x0, 1).replace(',0', '')}</text>`;
  g += `<line x1="${X(xs)}" x2="${X(xs)}" y1="${Y(1)}" y2="${H - pb + 4}" class="ax"/><text x="${X(xs)}" y="${H - 8}" text-anchor="middle" font-size="11" class="mt">x* = ${fmt(xs, 1).replace(',0', '')}</text>`;
  if (fin(x)) g += `<line x1="${X(x)}" x2="${X(x)}" y1="${Y(f(x))}" y2="${Y(0)}" stroke="var(--accent)" stroke-dasharray="3 3"/><circle cx="${X(x)}" cy="${Y(f(x))}" r="5.5" fill="var(--accent)"/><text x="${X(x) + 8}" y="${Y(f(x)) - 8}" font-size="12" font-weight="700" fill="var(--accent)">x̃ = ${fmt(f(x))}</text>`;
  return `<svg class="svgbox" viewBox="0 0 ${W} ${H}" role="img" aria-label="Normalizácia indikátora">${g}</svg>`;
}

function causal(lines) { /* lines: [{name, role, dash}] */
  const W = 520, H = 280, pl = 44, pr = 16, pt = 16, pb = 36;
  const all = lines.flatMap(l => DIM_KEYS.map(k => l.role[k]));
  const dlo = Math.min(...all.map(p => p.d)) - 0.6, dhi = Math.max(...all.map(p => p.d)) + 0.6;
  const rm = Math.max(0.5, ...all.map(p => Math.abs(p.r))) * 1.3;
  const X = v => pl + (W - pl - pr) * (v - dlo) / (dhi - dlo), Y = v => pt + (H - pt - pb) * (1 - (v + rm) / (2 * rm));
  let g = `<rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${Y(0) - pt}" fill="var(--accent-soft)" opacity=".5"/>`;
  g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink)" stroke-width="1.2"/><line x1="${pl}" x2="${pl}" y1="${pt}" y2="${H - pb}" class="ax"/>`;
  g += `<text x="${W - pr - 4}" y="${pt + 14}" text-anchor="end" font-size="11" class="mt">hnacie (r > 0)</text><text x="${W - pr - 4}" y="${H - pb - 6}" text-anchor="end" font-size="11" class="mt">závislé (r < 0)</text>`;
  g += `<text x="${(W + pl) / 2}" y="${H - 6}" text-anchor="middle" font-size="11" class="mt">dôležitosť d = R + C</text><text x="12" y="${(H - pb + pt) / 2}" font-size="11" class="mt" transform="rotate(-90 12 ${(H - pb + pt) / 2})" text-anchor="middle">úloha r = R − C</text>`;
  const step = Math.max(0.5, Math.ceil((dhi - dlo) / 6 * 2) / 2);
  for (let v = Math.ceil(dlo / step) * step; v <= dhi; v += step) g += `<text x="${X(v)}" y="${H - pb + 14}" text-anchor="middle" font-size="10" class="mt">${fmt(v, 1)}</text>`;
  lines.forEach((l, li) => DIM_KEYS.forEach(k => {
    const p = l.role[k], x = X(p.d), y = Y(p.r);
    g += l.dash ? `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="var(--surface)" stroke="var(--muted)" stroke-width="2"/>` : `<circle cx="${x}" cy="${y}" r="7" fill="var(--accent)"/>`;
    g += `<text x="${l.dash ? x - 11 : x + 11}" y="${y + 4}" text-anchor="${l.dash ? 'end' : 'start'}" font-size="13" font-weight="700">${k}${lines.length > 1 ? `<tspan font-weight="400" class="mt" font-size="11"> ${esc(l.name)}</tspan>` : ''}</text>`;
  }));
  return `<svg class="svgbox" viewBox="0 0 ${W} ${H}" role="img" aria-label="Príčinný diagram DEMATEL">${g}</svg>`;
}

function histogram(ks, lo, hi) {
  if (!ks.length) return '';
  const W = 520, H = 190, pl = 10, pr = 10, pt = 14, pb = 30, nb = 34;
  const a = Math.min(ks[0], 0.9), b = Math.max(ks[ks.length - 1], 1.1);
  const bins = Array(nb).fill(0); ks.forEach(k => { bins[Math.min(nb - 1, Math.floor((k - a) / (b - a) * nb))]++; });
  const mx = Math.max(...bins), X = v => pl + (W - pl - pr) * (v - a) / (b - a), bw = (W - pl - pr) / nb;
  let g = `<rect x="${X(lo)}" y="${pt}" width="${X(hi) - X(lo)}" height="${H - pt - pb}" fill="var(--accent-soft)"/>`;
  bins.forEach((c, i) => { const h = (H - pt - pb) * c / mx; g += `<rect x="${pl + i * bw + 1}" y="${H - pb - h}" width="${bw - 2}" height="${h}" fill="var(--accent)" opacity=".75"/>`; });
  g += `<line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" class="ax"/>`;
  g += `<line x1="${X(1)}" x2="${X(1)}" y1="${pt - 4}" y2="${H - pb + 4}" stroke="var(--bad)" stroke-width="2" stroke-dasharray="4 3"/><text x="${X(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--bad)">κ = 1</text>`;
  g += `<text x="${X(lo)}" y="${H - pb + 14}" text-anchor="middle" font-size="10" class="mt">${fmt(lo)}</text><text x="${X(hi)}" y="${H - pb + 14}" text-anchor="middle" font-size="10" class="mt">${fmt(hi)}</text>`;
  return `<svg class="svgbox" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rozdelenie bootstrapových hodnôt κ">${g}</svg>`;
}

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200); }
function modal(html, cls) { const m = $('#modal'); m.firstElementChild.className = cls || ''; m.firstElementChild.innerHTML = html; m.classList.add('on'); }
function closeModal() { const m = $('#modal'), wz = m.classList.contains('on') && m.querySelector('.wz'); m.classList.remove('on'); if (wz && typeof full === 'function') full(); }
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Skopírované do schránky'); }
  catch (e) { modal(`<h2>Skopírujte text</h2><p class="muted small">Schránka nie je v tomto okne dostupná. Označte text a skopírujte ho ručne.</p><textarea class="inp" style="min-height:260px" id="cpy">${esc(txt)}</textarea><div class="row"><button class="btn" data-act="closemodal">Zavrieť</button></div>`); setTimeout(() => { const t = $('#cpy'); t && t.select(); }, 30); }
}
