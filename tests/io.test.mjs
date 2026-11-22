// Overenie formátov súborov: projekt JSON a údaje linky v CSV (šablóna na zber údajov aj výsledky).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModel } from './load.mjs';

const M = loadModel();
const plain = (o) => JSON.parse(JSON.stringify(o));
const sk = (v) => String(v).replace('.', ',');

// CSV v tvare šablóny z aplikácie (bodkočiarka, desatinná čiarka, BOM ako z Excelu)
function templateFor(l, { delim = ';', dec = sk } = {}) {
  const R = [], row = (...c) => R.push(c.map((v) => (/[;,"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(delim));
  row('Model synergie adaptívnej montáže – údaje linky', `${l.name} (${l.sub})`);
  row('Pokyny', 'Do stĺpca x zapíšte namerané hodnoty; súbor uložte ako CSV.');
  row('');
  row('Údaj linky', 'Hodnota');
  row('Q – dobré kusy za zmenu [ks]', dec(l.prod.Q)); row('N – operátori na zmenu', dec(l.prod.N)); row('t – plánovaný čas zmeny [h]', dec(l.prod.t));
  row('');
  row('Kód', 'Indikátor', 'Jednotka', 'x', 'x0', 'x*', 'w', '');
  for (const i of M.INDICATORS) { const v = l.ind[i.c]; row(i.c, i.n, i.u, dec(v.x), dec(v.x0), dec(v.xs), dec(v.w), ''); }
  row('');
  row('Kód', 'Indikátor hrany', 'Jednotka', 'x', 'x0', 'x*', '', '');
  for (const i of M.EDGE_IND) { const v = l.edge[i.c]; row(i.c, i.n, i.u, dec(v.x), dec(v.x0), dec(v.xs), '', ''); }
  row('');
  row('Opatrenie', 'Hrana', 'Zodpovedný', 'Termín');
  row('Rotácia podľa kvalifikačnej matice; pilot', 'P–T', 'majster zmeny', '31. 3. 2027');
  return '﻿' + R.join('\r\n') + '\r\n';
}
// Rovnaké prenesenie hodnôt ako applyLineData v aplikácii
function applyTo(l, d) {
  for (const c in d.ind) { const v = d.ind[c], t = l.ind[c]; t.x = v.x; for (const f of ['x0', 'xs', 'w']) if (v[f] != null) t[f] = v[f]; }
  for (const c in d.edge) { const v = d.edge[c], t = l.edge[c]; t.x = v.x; for (const f of ['x0', 'xs']) if (v[f] != null) t[f] = v[f]; }
  return l;
}
const tsiOf = (l) => {
  const I = M.dimIndices(l).I, q = M.edgeQualities(l).q;
  for (const k of M.DIM_KEYS) I[k] = M.r2(I[k]);
  for (const k of M.EDGE_KEYS) q[k] = M.r2(q[k]);
  return M.synergy(I, q).TSI;
};

test('parseCSV: oddeľovač, úvodzovky, BOM a konce riadkov', () => {
  const a = M.parseCSV('﻿A;B;C\r\n"x;y";"povedal ""áno""";3\n"riadok\ns novým riadkom";;\n');
  assert.equal(a.delim, ';');
  assert.deepEqual(plain(a.rows), [['A', 'B', 'C'], ['x;y', 'povedal "áno"', '3'], ['riadok\ns novým riadkom', '', '']]);
  const b = M.parseCSV('Kód,Hodnota\nT1,"1,5"');
  assert.equal(b.delim, ',');
  assert.deepEqual(plain(b.rows), [['Kód', 'Hodnota'], ['T1', '1,5']]);
});

test('csvNum: desatinná čiarka, mínus, medzery a prázdne bunky', () => {
  assert.equal(M.csvNum('0,25', ';'), 0.25);
  assert.equal(M.csvNum('−1,5', ';'), -1.5);
  assert.equal(M.csvNum('-1,5', ';'), -1.5);
  assert.equal(M.csvNum('1 234,5', ';'), 1234.5);
  assert.equal(M.csvNum('0.25', ','), 0.25);
  assert.equal(M.csvNum('', ';'), null);
  assert.equal(M.csvNum('  ', ';'), null);
  assert.equal(M.csvNum('n/a', ';'), null);
});

test('csvDate: ISO dátum aj slovenský zápis z Excelu', () => {
  assert.equal(M.csvDate('2027-03-01'), '2027-03-01');
  assert.equal(M.csvDate('1. 3. 2027'), '2027-03-01');
  assert.equal(M.csvDate('15.4.2027'), '2027-04-15');
  assert.equal(M.csvDate(''), '');
  assert.equal(M.csvDate('marec'), '');
});

test('údaje linky: dátum auditu a audítor zo sekcie Údaj linky', () => {
  const csv = 'Model synergie adaptívnej montáže – údaje linky;Linka 3 (montáž dverí)\r\n\r\nÚdaj linky;Hodnota\r\nDátum auditu;1. 3. 2027\r\nAudítor;Ing. Nováková\r\nQ – dobré kusy za zmenu [ks];900\r\n\r\nKód;Indikátor;Jednotka;x;x0;x*;w\r\nT1;Čas prestavby;min;12;45;5;0,29\r\n';
  const d = M.lineDataFromCSV(csv);
  assert.equal(d.name, 'Linka 3');
  assert.equal(d.sub, 'montáž dverí');
  assert.equal(d.auditDate, '2027-03-01');
  assert.equal(d.auditor, 'Ing. Nováková');
  assert.equal(d.prod.Q, 900);
  assert.equal(d.found, 1);
});

test('šablóna CSV s hodnotami linky Y vráti rovnaký TSI ako linka Y (0,263)', () => {
  const y = M.lineY();
  const d = M.lineDataFromCSV(templateFor(y));
  assert.equal(d.name, y.name);
  assert.equal(d.sub, y.sub);
  assert.equal(d.found, M.INDICATORS.length + M.EDGE_IND.length);
  assert.deepEqual(plain(d.prod), { Q: y.prod.Q, N: y.prod.N, t: y.prod.t });
  assert.equal(d.plan.length, 1);
  assert.equal(d.plan[0].m, 'Rotácia podľa kvalifikačnej matice; pilot');
  const l = applyTo(M.emptyLine('L', 'Import'), d);
  assert.equal(M.rnd(tsiOf(l), 3), 0.263);
  assert.equal(tsiOf(l), tsiOf(y));
});

test('CSV s čiarkou a desatinnou bodkou (iné nastavenie Excelu) sa načíta rovnako', () => {
  const y = M.lineY();
  const d = M.lineDataFromCSV(templateFor(y, { delim: ',', dec: (v) => String(v) }));
  assert.equal(tsiOf(applyTo(M.emptyLine('L', 'Import'), d)), tsiOf(y));
});

test('prázdny stĺpec x: hodnoty chýbajú a indexy sa nepočítajú', () => {
  const tpl = M.emptyLine('L', 'Nová');
  const d = M.lineDataFromCSV(templateFor({ ...tpl, sub: 'zber', prod: { Q: null, N: null, t: 7.5 } }, { dec: (v) => (v == null ? '' : sk(v)) }));
  assert.equal(d.ind.T1.x, null);
  assert.equal(d.ind.T1.x0, tpl.ind.T1.x0);
  const l = applyTo(M.emptyLine('L', 'Import'), d);
  const di = M.dimIndices(l);
  assert.ok(Number.isNaN(di.I.T));
  assert.equal(di.missing.T, 5);
  assert.equal(M.edgeQualities(l).missing, 6);
});

test('výsledky linky zadanej priamo (sekcia Priamy vstup)', () => {
  const csv = 'Model synergie adaptívnej montáže – výsledky linky;Linka X (ručne mechanizovaná)\r\n\r\nPriamy vstup;Hodnota;Popis\r\nT;0,720;I(t)\r\nS;0,480;I(s)\r\nP;0,610;I(p)\r\nTS;0,550;q\r\nSP;0,600;q\r\nPT;0,700;q\r\nT1;25,00;čas prestavby\r\n';
  const d = M.lineDataFromCSV(csv);
  assert.equal(d.found, 0);
  assert.equal(d.directFound, 6);
  assert.deepEqual(plain(d.direct), { T: 0.72, S: 0.48, P: 0.61, TS: 0.55, SP: 0.6, PT: 0.7 });
  assert.equal(d.adapt.T1, 25);
});

test('CSV bez tabuľky indikátorov sa odmietne so zrozumiteľnou chybou', () => {
  assert.throws(() => M.lineDataFromCSV('Meno;Vek\nJana;30\n'), /tabuľka indikátorov/);
});

test('projekt JSON: uloženie a otvorenie zachová údaje', () => {
  const state = { v: 1, project: { name: 'Závod 1' }, lineId: 'Y', round2: true, seq: 3, lines: [M.lineX(), M.lineY()], ahp: plain(M.AHP_EXAMPLE), ev: {} };
  const text = M.projectJSON(state);
  const o = JSON.parse(text);
  assert.equal(o.app, M.APP_ID);
  assert.equal(o.format, 2);
  assert.ok(!Number.isNaN(Date.parse(o.savedAt)));
  assert.deepEqual(plain(M.stateFromJSON(o)), plain(state));
});

test('stateFromJSON: prijme aj uloženú verziu a starší export, doplní chýbajúce časti', () => {
  const legacy = { v: 1, lineId: 'Z', lines: [{ ...M.lineY(), scen: undefined, plan: undefined }] };
  const s = M.stateFromJSON(legacy);
  assert.equal(s.lineId, 'Y');
  assert.equal(typeof s.project.name, 'string');
  assert.deepEqual(plain(s.ahp), plain(M.AHP_EXAMPLE));
  assert.deepEqual(plain(s.ev), {});
  assert.equal(s.seq, 2);
  assert.equal(s.round2, true);
  assert.deepEqual(plain(s.lines[0].scen), []);
  assert.deepEqual(plain(s.lines[0].plan), []);
  const saved = { kind: 'save', name: 'Pred auditom', state: { v: 1, lines: [M.lineX()], lineId: 'X' } };
  const t = M.stateFromJSON(saved);
  assert.equal(t.project.name, 'Pred auditom');
  assert.notEqual(t.lines, saved.state.lines, 'vráti kópiu, nie pôvodný objekt');
});

test('stateFromJSON: odmietne súbor, ktorý nie je projekt', () => {
  assert.throws(() => M.stateFromJSON({ foo: 1 }), /nie je projekt/);
  assert.throws(() => M.stateFromJSON({ v: 1, lines: [] }), /nie je projekt/);
  assert.throws(() => M.stateFromJSON(null), /nie je projekt/);
});
