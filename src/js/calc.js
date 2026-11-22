/* ===== Výpočty modelu (vzťahy 6.1 – 6.33) ===== */
const rnd = (v, d) => { const k = 10 ** d; return Math.sign(v) * Math.round(Math.abs(v) * k * (1 + 1e-12)) / k; };
const r2 = v => rnd(v, 2);
const clip01 = v => Math.max(0, Math.min(1, v));

/* (6.1)/(6.2): (x − x0)/(x* − x0) pokrýva oba smery */
function normalize(x, x0, xs) {
  if (![x, x0, xs].every(Number.isFinite) || x0 === xs) return null;
  return clip01((x - x0) / (xs - x0));
}
function normRaw(x, x0, xs) {
  if (![x, x0, xs].every(Number.isFinite) || x0 === xs) return null;
  return (x - x0) / (xs - x0);
}

function dimIndices(line) {
  const out = { I: {}, wsum: {}, norm: {}, missing: {} };
  for (const d of DIM_KEYS) {
    let s = 0, ws = 0, miss = 0;
    for (const ind of INDICATORS.filter(i => i.d === d)) {
      const v = line.ind[ind.c];
      const n = normalize(v.x, v.x0, v.xs);
      out.norm[ind.c] = n;
      if (Number.isFinite(v.w)) ws += v.w;
      if (n == null || !Number.isFinite(v.w)) { miss++; continue; }
      s += v.w * n;
    }
    out.I[d] = miss ? NaN : s; out.wsum[d] = ws; out.missing[d] = miss;
  }
  return out;
}
function edgeQualities(line) {
  const q = {}, norm = {};
  let missing = 0;
  for (const e of EDGE_KEYS) {
    const vals = [], all = EDGE_IND.filter(x => x.e === e).length;
    for (const ei of EDGE_IND.filter(x => x.e === e)) {
      const v = line.edge[ei.c];
      const n = normalize(v.x, v.x0, v.xs);
      norm[ei.c] = n;
      if (n != null) vals.push(n);
    }
    missing += all - vals.length;
    q[e] = vals.length === all ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN; /* (6.28) */
  }
  return { q, norm, missing };
}

function synergy(I, q) {
  const e = { TS: q.TS * I.T * I.S, SP: q.SP * I.S * I.P, PT: q.PT * I.P * I.T }; /* (6.7) */
  const TSI = (e.TS + e.SP + e.PT) / 3;                                         /* (6.8) */
  const TSIp = (I.T * I.S + I.S * I.P + I.P * I.T) / 3;                          /* (6.6) */
  const mx = Math.max(I.T, I.S, I.P), mn = Math.min(I.T, I.S, I.P);
  const B = mx > 0 ? mn / mx : 0;                                                /* (6.10) */
  const order = EDGE_KEYS.slice().sort((a, b) => e[a] - e[b]);
  const weak = order[0], second = order[1];
  const gap = e[second] > 0 ? (e[second] - e[weak]) / e[second] : 1;
  return { e, TSI, TSIp, B, order, weak, second, close: gap < 0.10, gap };
}

function bandOf(tsi) { return BANDS.find(b => tsi >= b.lo && tsi < b.hi) || BANDS[3]; }

function adaptIndex(vals, refs) { /* (6.21) */
  const keys = ['T1', 'T5', 'P5', 'S1'];
  const ns = keys.map(k => normalize(vals[k], refs[k][0], refs[k][1]));
  if (ns.some(n => n == null)) return { A: null, ns };
  return { A: ns.reduce((a, b) => a + b, 0) / 4, ns };
}

/* DEMATEL (6.12)–(6.16) */
function matAvg(list) {
  const n = 3, A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  list.forEach(M => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i][j] += (i === j ? 0 : M[i][j]) / list.length; });
  return A;
}
function matMul(A, B) { return A.map((row, i) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0))); }
function matInv(M) {
  const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    const pv = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= pv;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map(r => r.slice(n));
}
function dematel(experts) {
  const A = matAvg(experts);
  const rs = A.map(r => r.reduce((a, b) => a + b, 0)), cs = [0, 1, 2].map(j => A.reduce((s, r) => s + r[j], 0));
  const s = Math.max(...rs, ...cs);
  if (s <= 0) return { A, s, ok: false };
  const D = A.map(r => r.map(v => v / s));
  const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const inv = matInv(I3.map((r, i) => r.map((v, j) => v - D[i][j])));
  if (!inv) return { A, s, D, ok: false };
  const M = matMul(D, inv);
  const R = M.map(r => r.reduce((a, b) => a + b, 0)), C = [0, 1, 2].map(j => M.reduce((s2, r) => s2 + r[j], 0));
  const d = R.map((v, i) => v + C[i]), rr = R.map((v, i) => v - C[i]);
  const role = {}; DIM_KEYS.forEach((k, i) => { role[k] = { R: R[i], C: C[i], d: d[i], r: rr[i] }; });
  const drv = DIM_KEYS.slice().sort((a, b) => role[b].r - role[a].r)[0];
  const prom = DIM_KEYS.slice().sort((a, b) => role[b].d - role[a].d)[0];
  return { A, s, D, M, R, C, d, r: rr, role, driver: drv, prominent: prom, ok: true };
}

/* AHP – hlavný vlastný vektor mocninovou metódou, (6.26) a (6.27) */
function ahp(M) {
  const n = M.length;
  let w = Array(n).fill(1 / n);
  for (let it = 0; it < 200; it++) {
    const nw = M.map(row => row.reduce((s, v, j) => s + v * w[j], 0));
    const sm = nw.reduce((a, b) => a + b, 0);
    w = nw.map(v => v / sm);
  }
  const Aw = M.map(row => row.reduce((s, v, j) => s + v * w[j], 0));
  const lmax = Aw.reduce((s, v, i) => s + v / w[i], 0) / n;
  const CI = (lmax - n) / (n - 1);
  const CR = RI[n] ? CI / RI[n] : 0;
  return { w, lmax, CI, CR };
}

/* Štatistika */
function mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
function variance(a) { const m = mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); }
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015; for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function betacf(a, b, x) {
  const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function ibeta(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
function welch(y0, y1) { /* (6.31) */
  const n0 = y0.length, n1 = y1.length;
  if (n0 < 2 || n1 < 2) return null;
  const m0 = mean(y0), m1 = mean(y1), v0 = variance(y0), v1 = variance(y1);
  const se2 = v1 / n1 + v0 / n0;
  const t = (m1 - m0) / Math.sqrt(se2);
  const df = se2 * se2 / ((v1 / n1) ** 2 / (n1 - 1) + (v0 / n0) ** 2 / (n0 - 1));
  const p = ibeta(df / (df + t * t), df / 2, 0.5); /* obojstranná p-hodnota */
  return { n0, n1, m0, m1, v0, v1, t, df, p };
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function percentile(sorted, p) { const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); }
function bootKappa(g, B, seed) { /* (6.32) */
  const rnd = mulberry32(seed || 7);
  const res = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[Math.floor(rnd() * a.length)]; return s / a.length; };
  const ks = [];
  for (let b = 0; b < B; b++) {
    const m0 = res(g.S0), d1 = res(g.S1) - m0, d2 = res(g.S2) - m0, d3 = res(g.S3) - m0, d4 = res(g.S4) - m0;
    const den = d1 + d2 + d3;
    if (Math.abs(den) > 1e-9) ks.push(d4 / den);
  }
  ks.sort((a, b) => a - b);
  const m = k => mean(g[k]);
  const point = (m('S4') - m('S0')) / ((m('S1') - m('S0')) + (m('S2') - m('S0')) + (m('S3') - m('S0')));
  return { ks, lo: percentile(ks, 0.025), hi: percentile(ks, 0.975), point };
}
function demoSeries(n, mu, sd, rnd) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = Math.max(rnd(), 1e-9), v = rnd();
    out.push(mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
  }
  const sh = mu - out.reduce((a, b) => a + b, 0) / n; /* priemer vzorky = modelová hodnota */
  return out.map(x => Math.round((x + sh) * 100) / 100);
}
