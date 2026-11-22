// Overenie výpočtov voči tabuľkám kapitoly 6 habilitačnej práce (modelové hodnoty liniek X a Y).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModel } from './load.mjs';

const M = loadModel();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b} (±${tol})`);
const round3 = (v) => M.rnd(v, 3);

// Stav linky tak, ako ho počíta aplikácia pri zaokrúhľovaní „ako v práci“
function lineState(l) {
  let I, q;
  if (l.mode === 'ind' && l.ind) { I = M.dimIndices(l).I; q = M.edgeQualities(l).q; }
  else { I = { T: l.direct.T, S: l.direct.S, P: l.direct.P }; q = { TS: l.direct.TS, SP: l.direct.SP, PT: l.direct.PT }; }
  for (const k of M.DIM_KEYS) I[k] = M.r2(I[k]);
  for (const k of M.EDGE_KEYS) q[k] = M.r2(q[k]);
  return { I, q, ...M.synergy(I, q) };
}

test('normalizácia (6.1)/(6.2): príklad z kap. 6.6.1 a orezanie', () => {
  near(M.normalize(20, 40, 10), 0.6667, 1e-4, 'čas prestavby 20 min, x0 40, x* 10');
  assert.equal(M.normalize(5, 40, 10), 1);
  assert.equal(M.normalize(60, 40, 10), 0);
  assert.equal(M.normalize(10, 10, 10), null);
});

test('linka X, stav S0 (tab. 6.19): príspevky hrán, TSI, B, najslabšia hrana', () => {
  const s = lineState(M.lineX());
  near(round3(s.e.TS), 0.190, 1e-9, 'e(T–S)');
  near(round3(s.e.SP), 0.176, 1e-9, 'e(S–P)');
  near(round3(s.e.PT), 0.307, 1e-9, 'e(P–T)');
  near(round3(s.TSI), 0.224, 1e-9, 'TSI');
  near(M.r2(s.B), 0.67, 1e-9, 'B');
  assert.equal(s.weak, 'SP');
  assert.equal(s.close, true, 'S–P a T–S sa líšia o menej ako 10 % (kap. 6.9.6)');
  assert.equal(M.bandOf(s.TSI).name, 'Fragmentovaná');
});

test('linka Y z 15 indikátorov (tab. 6.24) a indikátorov hrán (tab. 6.25)', () => {
  const s = lineState(M.lineY());
  const plain = (o) => JSON.parse(JSON.stringify(o)); // objekty z iného kontextu vm
  assert.deepEqual(plain(s.I), { T: 0.79, S: 0.64, P: 0.61 });
  assert.deepEqual(plain(s.q), { TS: 0.72, SP: 0.60, PT: 0.39 });
  near(round3(s.TSI), 0.262, 1e-9, 'TSI');
  near(M.r2(s.B), 0.77, 1e-9, 'B');
  assert.equal(s.weak, 'PT');
  assert.equal(M.bandOf(s.TSI).name, 'Rozvíjajúca sa');
});

test('penalizácia nevyváženosti (tab. 6.12)', () => {
  const tsiP = (t, s, p) => M.synergy({ T: t, S: s, P: p }, { TS: 1, SP: 1, PT: 1 }).TSIp;
  near(tsiP(0.6, 0.6, 0.6), 0.360, 5e-4, '(0,6; 0,6; 0,6)');
  near(tsiP(0.8, 0.6, 0.4), 0.347, 5e-4, '(0,8; 0,6; 0,4)');
  near(tsiP(0.9, 0.6, 0.3), 0.330, 5e-4, '(0,9; 0,6; 0,3)');
  near(tsiP(0.9, 0.9, 0.0), 0.270, 5e-4, '(0,9; 0,9; 0,0)');
});

test('DEMATEL linky X (tab. 6.21) a linky Y (tab. 6.26)', () => {
  const x = M.dematel(M.lineX().dem);
  assert.equal(x.s, 6);
  const expX = { T: [1.80, 1.44, 3.24, 0.36], S: [1.53, 2.51, 4.04, -0.98], P: [2.20, 1.58, 3.78, 0.62] };
  for (const k of M.DIM_KEYS) {
    const r = x.role[k], e = expX[k];
    near(r.R, e[0], 0.006, `X R(${k})`); near(r.C, e[1], 0.006, `X C(${k})`); near(r.d, e[2], 0.006, `X d(${k})`); near(r.r, e[3], 0.006, `X r(${k})`);
  }
  assert.equal(x.driver, 'P');
  const y = M.dematel(M.lineY().dem);
  near(y.role.T.r, 0.96, 0.006, 'Y r(T)'); near(y.role.S.r, -1.08, 0.006, 'Y r(S)'); near(y.role.P.r, 0.11, 0.006, 'Y r(P)');
  near(y.role.T.d, 6.09, 0.006, 'Y d(T)'); near(y.role.P.d, 6.04, 0.006, 'Y d(P)');
  assert.equal(y.driver, 'T');
});

test('scenáre linky X (tab. 6.15) a linky Y (tab. 6.28): ΔTSI a B', () => {
  const exp = {
    X: { S1: [0.019, 0.63], S2: [0.046, 0.83], S3: [0.043, 0.69], S4: [0.186, 0.89], S5: [0.116, 0.79], S6: [0.098, 0.65] },
    Y: { S1: [0.015, 0.73], S2: [0.045, 0.77], S3: [0.033, 0.81], S4: [0.174, 0.85], S5: [0.099, 0.88], S6: [0.087, 0.78] }
  };
  for (const [id, mk] of [['X', M.lineX], ['Y', M.lineY]]) {
    const l = mk(), s0 = lineState(l);
    for (const sc of l.scen) {
      const s = M.synergy(sc.I, sc.q);
      near(round3(s.TSI) - round3(s0.TSI), exp[id][sc.id][0], 1e-9, `${id} ${sc.id} ΔTSI`);
      near(M.r2(s.B), exp[id][sc.id][1], 1e-9, `${id} ${sc.id} B`);
    }
  }
});

test('scenáre linky Y (tab. 6.28): TSI', () => {
  const exp = { S1: 0.277, S2: 0.307, S3: 0.295, S4: 0.436, S5: 0.361, S6: 0.349 };
  for (const sc of M.lineY().scen) near(round3(M.synergy(sc.I, sc.q).TSI), exp[sc.id], 1e-9, `TSI ${sc.id}`);
});

test('starší projekt: vo vzorovej linke Y sa zmenia len bunky s pôvodnou hodnotou', () => {
  const old = M.lineY();
  old.ind.T2.x = 88; old.ind.S1.x = 45; old.edge.SP1.x = 65; old.direct.T = 0.80; old.direct.SP = 0.59; old.adapt.S1 = 45;
  const o4 = old.scen.find((s) => s.id === 'S4'); o4.I.T = 0.84; o4.I.S = 0.68; o4.q.SP = 0.63; o4.ad.S1 = 58;
  const o1 = old.scen.find((s) => s.id === 'S1'); o1.I.T = 0.90; // hodnota zmenená používateľom ostane
  assert.equal(M.updateSampleY(old), 10);
  const y = M.lineY();
  assert.equal(old.ind.T2.x, 83.33); assert.equal(old.ind.S1.x, 43.75); assert.equal(old.edge.SP1.x, 66.7);
  assert.deepEqual(JSON.parse(JSON.stringify(o4)), JSON.parse(JSON.stringify(y.scen.find((s) => s.id === 'S4'))));
  assert.equal(o1.I.T, 0.90);
  const copy = { ...M.lineY(), id: 'L3', builtin: false }; copy.ind.T2.x = 88;
  assert.equal(M.updateSampleY(copy), 0, 'kópia linky Y sa nemení');
  assert.equal(M.updateSampleY(M.lineY()), 0, 'nové údaje sa už nemenia');
});

test('koeficient synergie κ (6.18): linka X 1,28 a linka Y 1,32', () => {
  for (const [mk, Y0, k] of [[M.lineX, 10.0, 1.28], [M.lineY, 36.0, 1.32]]) {
    const l = mk(), by = (id) => l.scen.find((s) => s.id === id).Y - Y0;
    near(M.r2(by('S4') / (by('S1') + by('S2') + by('S3'))), k, 1e-9, 'κ');
  }
});

test('efektívnosť investície η (6.33) na linke Y (tab. 6.29)', () => {
  const l = M.lineY(), s0 = lineState(l), exp = { S1: 0.010, S2: 0.064, S3: 0.055, S4: 0.092, S5: 0.054, S6: 0.045 };
  for (const sc of l.scen) {
    const dT = round3(M.synergy(sc.I, sc.q).TSI) - round3(s0.TSI);
    near(round3(dT / sc.cost * 100), exp[sc.id], 1e-9, `η ${sc.id}`);
  }
});

test('index adaptability A (6.21): S0 a S4 (tab. 6.31)', () => {
  const A = (v) => M.r2(M.adaptIndex(v, M.ADAPT_REF).A);
  assert.equal(A(M.lineX().adapt), 0.64);
  assert.equal(A(M.lineY().adapt), 0.64);
  assert.equal(A(M.lineX().scen.find((s) => s.id === 'S4').ad), 0.85);
  assert.equal(A(M.lineY().scen.find((s) => s.id === 'S4').ad), 0.83);
});

test('AHP: ukážkové porovnania sú konzistentné a dávajú váhy blízke tab. 6.24', () => {
  for (const d of M.DIM_KEYS) {
    const up = M.AHP_EXAMPLE[d], A = [];
    for (let i = 0; i < 5; i++) { A.push([]); for (let j = 0; j < 5; j++) A[i].push(i === j ? 1 : i < j ? up[i][j - i - 1] : 1 / up[j][i - j - 1]); }
    const r = M.ahp(A);
    assert.ok(r.CR <= 0.10, `CR ${d} = ${r.CR}`);
    near(r.w.reduce((a, b) => a + b, 0), 1, 1e-9, `Σw ${d}`);
    const wY = M.INDICATORS.filter((i) => i.d === d).map((i) => M.lineY().ind[i.c].w);
    r.w.forEach((w, k) => near(w, wY[k], 0.03, `w ${d}${k + 1}`));
  }
});

test('Welchov t-test (6.31) zodpovedá referenčnému výpočtu', () => {
  const w = M.welch([1, 2, 3, 4, 5, 6], [3, 4, 5, 6, 7, 9.5]);
  near(w.t, 1.8500095, 1e-6, 't');
  near(w.df, 9.5727307, 1e-6, 'df');
  near(w.p, 0.0953721, 1e-6, 'p');
});
