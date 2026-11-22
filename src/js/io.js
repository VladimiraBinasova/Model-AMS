/* ===== Formáty súborov: projekt JSON a údaje linky v CSV (bez DOM) ===== */
const APP_ID = 'model-synergie-ams';

/* Prijme projekt uložený aplikáciou, uloženú verziu alebo starší export stavu a vráti platný stav */
function stateFromJSON(o) {
  const s = o && o.state && Array.isArray(o.state.lines) ? o.state : o;
  if (!s || s.v !== 1 || !Array.isArray(s.lines) || !s.lines.length) throw new Error('Súbor nie je projekt tejto aplikácie.');
  const out = JSON.parse(JSON.stringify(s));
  if (!out.project || typeof out.project.name !== 'string') out.project = { name: (o && o.name) || 'Projekt' };
  if (!out.lines.find(l => l.id === out.lineId)) out.lineId = out.lines[0].id;
  if (!out.ahp) out.ahp = JSON.parse(JSON.stringify(AHP_EXAMPLE));
  if (!out.ev) out.ev = {};
  if (typeof out.seq !== 'number') out.seq = out.lines.length + 1;
  if (typeof out.round2 !== 'boolean') out.round2 = true;
  out.lines.forEach(l => { l.scen = l.scen || []; l.plan = l.plan || []; l.dem = l.dem && l.dem.length ? l.dem : [[[0, 0, 0], [0, 0, 0], [0, 0, 0]]]; l.prod = l.prod || { Q: null, N: null, t: 7.5 }; l.valid = l.valid || { sim: null, real: null }; });
  return out;
}
function projectJSON(state) {
  return JSON.stringify({ app: APP_ID, format: 2, savedAt: new Date().toISOString(), state }, null, 1);
}

/* CSV: oddeľovač sa zistí z prvého riadku (bodkočiarka z Excelu v slovenčine, inak čiarka) */
function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const delim = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return { rows, delim };
}
/* Dátum z bunky CSV: 2027-03-01, 1. 3. 2027 alebo 1.3.2027 (ako ho uloží Excel) → RRRR-MM-DD */
function csvDate(s) {
  s = String(s == null ? '' : s).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}
function csvNum(s, delim) {
  s = String(s == null ? '' : s).trim().replace(/[\s ]/g, '').replace('−', '-');
  if (!s) return null;
  if (delim === ';') s = s.replace(',', '.');
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
/* Údaje linky z CSV, ktoré aplikácia exportuje (výsledky alebo šablóna); stĺpce Kód; Indikátor; Jednotka; x; x0; x*; w */
function lineDataFromCSV(text) {
  const { rows, delim } = parseCSV(text);
  const out = { name: '', sub: '', auditDate: '', auditor: '', ind: {}, edge: {}, prod: {}, plan: [], direct: {}, adapt: {}, found: 0, directFound: 0 };
  const t = rows[0] || [];
  if (t[1] && String(t[1]).trim()) { const m = String(t[1]).trim().match(/^(.*?)\s*\((.*)\)$/); out.name = m ? m[1] : String(t[1]).trim(); out.sub = m ? m[2] : ''; }
  const indC = new Set(INDICATORS.map(i => i.c)), edgeC = new Set(EDGE_IND.map(i => i.c));
  let sec = null;
  for (const r of rows) {
    const c0 = String(r[0] || '').trim(), c1 = String(r[1] || '').trim();
    if (!r.some(x => String(x).trim())) { sec = null; continue; }
    if (c0 === 'Kód' && c1 === 'Indikátor') { sec = 'ind'; continue; }
    if (c0 === 'Kód' && c1 === 'Indikátor hrany') { sec = 'edge'; continue; }
    if (c0 === 'Údaj linky') { sec = 'prod'; continue; }
    if (c0 === 'Opatrenie') { sec = 'plan'; continue; }
    if (c0 === 'Priamy vstup') { sec = 'direct'; continue; }
    if (sec === 'ind' && indC.has(c0)) { out.ind[c0] = { x: csvNum(r[3], delim), x0: csvNum(r[4], delim), xs: csvNum(r[5], delim), w: csvNum(r[6], delim) }; out.found++; }
    else if (sec === 'edge' && edgeC.has(c0)) { out.edge[c0] = { x: csvNum(r[3], delim), x0: csvNum(r[4], delim), xs: csvNum(r[5], delim) }; out.found++; }
    else if (sec === 'prod') {
      const k = c0.split(/\s/)[0];
      if (k === 'Q' || k === 'N' || k === 't') out.prod[k] = csvNum(r[1], delim);
      else if (c0 === 'Dátum auditu') out.auditDate = csvDate(r[1]);
      else if (c0 === 'Audítor') out.auditor = c1;
    }
    else if (sec === 'direct') {
      const v = csvNum(r[1], delim);
      if (['T', 'S', 'P', 'TS', 'SP', 'PT'].includes(c0)) { out.direct[c0] = v; out.directFound++; }
      else if (['T1', 'T5', 'P5', 'S1'].includes(c0)) out.adapt[c0] = v;
    }
    else if (sec === 'plan' && c0) out.plan.push({ m: c0, e: c1, r: String(r[2] || '').trim(), t: String(r[3] || '').trim() });
  }
  if (!out.found && !out.directFound) throw new Error('V súbore sa nenašla tabuľka indikátorov (Kód; Indikátor; Jednotka; x; x0; x*; w) ani priamo zadané indexy. Použite šablónu z časti Súbory a verzie.');
  return out;
}
