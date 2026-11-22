/* ===== Dáta z kapitoly 6 (habilitačná práca, Biňasová) ===== */
const DIMS = {
  T: { name: 'Technologická', gen: 'technologickej', key: 'T',
       short: 'technika: stanice, prípravky, roboty, informačný systém',
       desc: 'Do akej miery technické prostriedky linky (stanice, prípravky, manipulačná technika, roboty a koboty, informačné systémy) spolupracujú ako kompatibilný a rekonfigurovateľný celok. Zahŕňa modularitu, štandardizované rozhrania, digitálnu konektivitu a rýchlosť prestavby.',
       tags: 'modularita, rekonfigurovateľnosť, konektivita, rýchlosť prestavby' },
  S: { name: 'Socio-technická', gen: 'socio-technickej', key: 'S',
       short: 'ľudia: kvalifikácia, ergonómia, prijatie techniky',
       desc: 'Súlad medzi ľuďmi a technikou. Zahŕňa flexibilitu a kvalifikáciu pracovníkov, ergonómiu a kognitívnu záťaž, akceptáciu nových technológií a kvalitu spolupráce človeka s kobotom alebo asistenčným systémom.',
       tags: 'kvalifikácia a flexibilita ľudí, ergonómia, akceptácia techniky' },
  P: { name: 'Procesno-organizačná', gen: 'procesno-organizačnej', key: 'P',
       short: 'organizácia procesu: vyváženie, štandardy, plánovanie',
       desc: 'Ako dobre je proces organizovaný a riadený. Zahŕňa vyváženie linky, štandardizovanú prácu, plánovanie a riadenie toku, informačné toky a schopnosť organizácie rýchlo zvládnuť zmenu.',
       tags: 'vyváženie, štandardizovaná práca, plánovanie a riadenie toku' }
};
const DIM_KEYS = ['T', 'S', 'P'];

/* Tab. 6.7 a 6.8 – indikátory dimenzií */
const INDICATORS = [
  { c: 'T1', d: 'T', n: 'Čas prestavby pri zmene variantu', m: 'Časová snímka, analýza SMED', u: 'min', dir: -1, f: 'T₁ = Σ t(p,k) / m' },
  { c: 'T2', d: 'T', n: 'Index modularity staníc', m: 'Podiel staníc so štandardizovaným rozhraním', u: '%', dir: 1, f: 'T₂ = n(š) / n · 100' },
  { c: 'T3', d: 'T', n: 'Technická dostupnosť', m: 'Zložka dostupnosti OEE', u: '%', dir: 1, f: 'T₃ = (t(pl) − t(st)) / t(pl) · 100' },
  { c: 'T4', d: 'T', n: 'Digitálna konektivita', m: 'Podiel staníc so zberom dát v reálnom čase', u: '%', dir: 1, f: 'T₄ = n(d) / n · 100' },
  { c: 'T5', d: 'T', n: 'Čas rekonfigurácie kapacity', m: 'Čas pridania alebo odobratia stanice', u: 'h', dir: -1, f: 'T₅ = Σ t(r,k) / r' },
  { c: 'S1', d: 'S', n: 'Index flexibility pracovníkov', m: 'Kvalifikačná matica: priemerný podiel staníc zvládnutých samostatne', u: '%', dir: 1, f: 'S₁ = ΣΣ z(li) / (N · n) · 100' },
  { c: 'S2', d: 'S', n: 'Ergonomická bezpečnosť', m: 'Podiel pracovísk v zelenom pásme (EAWS, RULA alebo OWAS)', u: '%', dir: 1, f: 'S₂ = n(z) / n(p) · 100' },
  { c: 'S3', d: 'S', n: 'Chyby ľudského faktora', m: 'Evidencia nezhôd, analýza príčin', u: 'ppm', dir: -1, f: 'S₃ = n(h) / Q(v) · 10⁶' },
  { c: 'S4', d: 'S', n: 'Akceptácia technológií', m: 'Dotazník, Likertova škála 1 až 5', u: 'bod', dir: 1, f: 'S₄ = ΣΣ L(jl) / (N(r) · k)' },
  { c: 'S5', d: 'S', n: 'Stabilita pracovnej sily', m: 'Fluktuácia a neplánovaná absencia', u: '%', dir: -1, f: 'S₅ = (O / N(p) + h(n) / h(f)) · 100' },
  { c: 'P1', d: 'P', n: 'Efektívnosť vyváženia linky', m: 'Diagram Yamazumi: súčet časov operácií / (počet staníc × takt)', u: '%', dir: 1, f: 'P₁ = LBE = Σ t(i) / (n · τ) · 100' },
  { c: 'P2', d: 'P', n: 'Celková efektívnosť zariadení', m: 'OEE linky', u: '%', dir: 1, f: 'P₂ = OEE = Dostupnosť · Výkonnosť · Kvalita' },
  { c: 'P3', d: 'P', n: 'Priebežná doba montáže', m: 'Mapovanie toku hodnôt (VSM)', u: 'min', dir: -1, f: 'P₃ = Σ (t(o,i) + t(č,i))' },
  { c: 'P4', d: 'P', n: 'Pokrytie štandardizovanou prácou', m: 'Podiel operácií s platným štandardom', u: '%', dir: 1, f: 'P₄ = o(s) / o · 100' },
  { c: 'P5', d: 'P', n: 'Čas reakcie na zmenu plánu', m: 'Od impulzu zmeny po stabilný výkon', u: 'h', dir: -1, f: 'P₅ = Σ (t(s,k) − t(z,k)) / z' }
];

/* Hrany – kap. 6.5, tab. 6.10 */
const EDGES = {
  TS: { k: 'TS', lab: 'T–S', a: 'T', b: 'S', name: 'rozhranie človek – technika',
        desc: 'Technika je prínosná len vtedy, ak ju ľudia vedia a chcú používať.',
        tools: 'asistenčné systémy (pick-to-light, projekcia pracovných inštrukcií), kolaboratívne roboty, ergonomicky navrhnuté a nastaviteľné pracoviská, cielené zaškolenie na novú techniku' },
  SP: { k: 'SP', lab: 'S–P', a: 'S', b: 'P', name: 'organizácia práce',
        desc: 'Proces je stabilný len vtedy, ak organizácia práce zodpovedá schopnostiam pracovníkov.',
        tools: 'rotácia pracovníkov podľa kvalifikačnej matice, samoriadené tímy, štandardizovaná práca vytvorená spolu s operátormi, neustále zlepšovanie (kaizen)' },
  PT: { k: 'PT', lab: 'P–T', a: 'P', b: 'T', name: 'riadenie a digitálna integrácia',
        desc: 'Technika je využitá len vtedy, ak ju proces vie riadiť a plánovať.',
        tools: 'prepojenie s MES, digitálne dvojča linky, plánovanie sekvencie variantov s ohľadom na prestavby, prediktívna údržba' }
};
const EDGE_KEYS = ['TS', 'SP', 'PT'];
const EDGE_IND = [
  { c: 'TS1', e: 'TS', n: 'Podiel staníc s asistenčným systémom tam, kde ho vyžaduje zložitosť operácie', m: 'Zoznam staníc a posúdenie zložitosti operácií', u: '%' },
  { c: 'TS2', e: 'TS', n: 'Podiel operátorov zaškolených na novú techniku', m: 'Evidencia školení a kvalifikačná matica', u: '%' },
  { c: 'SP1', e: 'SP', n: 'Podiel operátorov zaradených do rotácie', m: 'Plán rotácie a kvalifikačná matica', u: '%' },
  { c: 'SP2', e: 'SP', n: 'Podiel štandardov vytvorených s účasťou operátorov', m: 'Evidencia štandardov a ich tvorcov', u: '%' },
  { c: 'PT1', e: 'PT', n: 'Podiel staníc prepojených s MES', m: 'Zoznam staníc a ich prepojenia na MES', u: '%' },
  { c: 'PT2', e: 'PT', n: 'Podiel prestavieb plánovaných v sekvencii variantov', m: 'Plán výroby a záznamy o prestavbách', u: '%' }
];

/* Tab. 6.11 – interpretačná škála TSI */
const BANDS = [
  { lo: 0.00, hi: 0.25, name: 'Fragmentovaná', cls: 'b1', ch: 'Dimenzie sa rozvíjajú izolovane, väzby sú slabé alebo chýbajú', rec: 'Audit synergie a opatrenia na najslabšiu hranu' },
  { lo: 0.25, hi: 0.50, name: 'Rozvíjajúca sa', cls: 'b2', ch: 'Väzby existujú, ale aspoň jedna hrana systém zreteľne limituje', rec: 'Cielené integrované opatrenia, opakovaný cyklus' },
  { lo: 0.50, hi: 0.75, name: 'Vysoká', cls: 'b3', ch: 'Dimenzie sú vyvážené, väzby fungujú, rezervy sú v jednotlivých indikátoroch', rec: 'Štandardizácia a jemné ladenie' },
  { lo: 0.75, hi: 1.0001, name: 'Integrovaná', cls: 'b4', ch: 'Systém sa adaptuje ako celok a zmeny zvláda bez straty výkonu', rec: 'Udržiavanie a prenos riešení na ďalšie linky' }
];

/* Referenčné hodnoty pre index adaptability A (tab. 6.31) */
const ADAPT_REF = { T1: [45, 5], T5: [40, 4], P5: [24, 2], S1: [20, 90] };

/* ---------- Linky X a Y ---------- */
function lineX() {
  return {
    id: 'X', name: 'Linka X', sub: 'ručne mechanizovaná', builtin: true, mode: 'direct', ind: null, edge: null,
    info: [
      ['Produkt', 'Elektromechanická podzostava, napr. ovládací modul'],
      ['Stanice', '8 (6 s operátormi, 1 kobot, 1 automatický test)'],
      ['Varianty', '3 (A : B : C = 50 : 30 : 20)'],
      ['Takt τ', '45 s'],
      ['Pracovníci na zmenu', '6 operátorov a 1 tímlíder'],
      ['Výkon zmeny Q', '450 ks pri OEE 75 %']
    ],
    direct: { T: 0.72, S: 0.48, P: 0.61, TS: 0.55, SP: 0.60, PT: 0.70 },
    adapt: { T1: 12, T5: 8, P5: 12, S1: 40 },
    prod: { Q: 450, N: 6, t: 7.5 },
    dem: [[[0, 3, 1], [1, 0, 2], [2, 3, 0]]],
    demNote: 'Priemerná matica panelu expertov z tab. 6.20',
    valid: { sim: 9.9, real: 10.0 },
    scen: [
      { id: 'S1', kind: 'iso', foc: 'T', name: 'izolovaná dimenzia T', meas: 'Modulárne prípravky so štandardizovaným rozhraním, skrátenie prestavby metódou SMED', I: { T: .76, S: .48, P: .62 }, q: { TS: .55, SP: .60, PT: .74 }, Y: 10.6, cost: null, ad: { T1: 7, T5: 6, P5: 12, S1: 40 } },
      { id: 'S2', kind: 'iso', foc: 'S', name: 'izolovaná dimenzia S', meas: 'Rozšírenie kvalifikačnej matice, školenia, ergonomické úpravy pracovísk', I: { T: .72, S: .60, P: .61 }, q: { TS: .62, SP: .64, PT: .70 }, Y: 10.4, cost: null, ad: { T1: 12, T5: 8, P5: 11, S1: 60 } },
      { id: 'S3', kind: 'iso', foc: 'P', name: 'izolovaná dimenzia P', meas: 'Vyváženie linky metódou Yamazumi, štandardizovaná práca, sekvencovanie variantov', I: { T: .72, S: .50, P: .70 }, q: { TS: .55, SP: .66, PT: .74 }, Y: 10.8, cost: null, ad: { T1: 12, T5: 8, P5: 9, S1: 42 } },
      { id: 'S4', kind: 'int', foc: 'SP', name: 'integrovaný, hrana S–P', meas: 'Opatrenia S1 až S3 zladené cez organizáciu práce: rotácia podľa kvalifikačnej matice, štandardy tvorené s operátormi, vyváženie s ohľadom na ergonomickú záťaž, asistenčný systém na staniciach s najvyššou chybovosťou', I: { T: .76, S: .68, P: .74 }, q: { TS: .75, SP: .80, PT: .78 }, Y: 12.3, cost: null, ad: { T1: 7, T5: 6, P5: 7, S1: 70 } },
      { id: 'S5', kind: 'int', foc: 'TS', name: 'integrovaný, hrana T–S', meas: 'Opatrenia zladené cez rozhranie človek–technika: asistenčné systémy a kobot s ergonomickou úpravou staníc, zaškolenie na novú techniku', I: { T: .78, S: .62, P: .66 }, q: { TS: .80, SP: .64, PT: .72 }, Y: null, cost: null, ad: { T1: 9, T5: 7, P5: 11, S1: 55 } },
      { id: 'S6', kind: 'int', foc: 'PT', name: 'integrovaný, hrana P–T', meas: 'Opatrenia zladené cez riadenie a digitálnu integráciu: prepojenie staníc s MES, sekvencovanie variantov s ohľadom na prestavby, prediktívna údržba', I: { T: .80, S: .52, P: .72 }, q: { TS: .58, SP: .64, PT: .84 }, Y: null, cost: null, ad: { T1: 10, T5: 7, P5: 7, S1: 42 } }
    ],
    cardScen: 'S4', months: 6,
    plan: [
      { m: 'Rotácia operátorov podľa kvalifikačnej matice', e: 'S–P', r: 'Majster linky', t: 'mesiac 1–2' },
      { m: 'Štandardizovaná práca tvorená s operátormi', e: 'S–P', r: 'Priemyselný inžinier', t: 'mesiac 1–3' },
      { m: 'Vyváženie linky (Yamazumi) s ohľadom na ergonómiu', e: 'S–P', r: 'Priemyselný inžinier', t: 'mesiac 2–3' },
      { m: 'Asistenčný systém na staniciach s najvyššou chybovosťou', e: 'T–S', r: 'Technológ', t: 'mesiac 3–4' }
    ]
  };
}

function yIndicators() {
  const v = {
    T1: [12, 45, 5, .29], T2: [83.33, 20, 100, .16], T3: [95, 80, 99, .30], T4: [83, 20, 100, .09], T5: [14, 40, 4, .16],
    S1: [43.75, 20, 90, .22], S2: [85, 50, 100, .37], S3: [110, 500, 20, .20], S4: [4.0, 2, 5, .11], S5: [8, 20, 2, .10],
    P1: [74, 50, 95, .21], P2: [72, 50, 90, .23], P3: [90, 180, 40, .11], P4: [72, 30, 100, .11], P5: [9, 24, 2, .34]
  };
  const o = {};
  for (const k in v) o[k] = { x: v[k][0], x0: v[k][1], xs: v[k][2], w: v[k][3] };
  return o;
}
function yEdges() {
  /* hodnoty z tab. 6.25; referenčné a cieľové hodnoty sú odvodené tak, aby zodpovedali normalizovaným hodnotám v tabuľke */
  return {
    TS1: { x: 75, x0: 0, xs: 100 }, TS2: { x: 75, x0: 20, xs: 100 },
    SP1: { x: 66.7, x0: 20, xs: 100 }, SP2: { x: 70, x0: 20, xs: 100 },
    PT1: { x: 33, x0: 0, xs: 100 }, PT2: { x: 45, x0: 0, xs: 100 }
  };
}

function lineY() {
  return {
    id: 'Y', name: 'Linka Y', sub: 'vysoko mechanizovaná', builtin: true, mode: 'ind', ind: yIndicators(), edge: yEdges(),
    info: [
      ['Produkt', 'Elektromechanická súčiastka, napr. relé'],
      ['Stanice', '12 (9 automatických alebo mechanizovaných, 3 manuálne)'],
      ['Varianty', '4 (A až D = 40 : 30 : 20 : 10)'],
      ['Takt τ', '18 s'],
      ['Pracovníci na zmenu', '4 operátori, 1 nastavovač, 1 tímlíder'],
      ['Výkon zmeny Q', '1 080 ks pri OEE 72 %']
    ],
    direct: { T: 0.79, S: 0.64, P: 0.61, TS: 0.72, SP: 0.60, PT: 0.39 },
    adapt: { T1: 12, T5: 14, P5: 9, S1: 43.75 },
    prod: { Q: 1080, N: 4, t: 7.5 },
    dem: [[[0, 2, 4], [1, 0, 1], [3, 2, 0]]],
    demNote: 'Priemerná matica panelu expertov z kap. 6.9.4',
    valid: { sim: 34.9, real: 36.0 },
    scen: [
      { id: 'S1', kind: 'iso', foc: 'T', name: 'izolovaná dimenzia T', meas: 'Skrátenie prestavby metódou SMED a modulárne prípravky so štandardizovaným rozhraním', I: { T: .84, S: .64, P: .61 }, q: { TS: .72, SP: .60, PT: .41 }, Y: 37.1, cost: 150, ad: { T1: 7, T5: 10, P5: 9, S1: 43.75 } },
      { id: 'S2', kind: 'iso', foc: 'S', name: 'izolovaná dimenzia S', meas: 'Rozšírenie kvalifikačnej matice, ergonomické úpravy manuálnych staníc', I: { T: .79, S: .74, P: .61 }, q: { TS: .76, SP: .64, PT: .39 }, Y: 36.8, cost: 70, ad: { T1: 12, T5: 14, P5: 8.5, S1: 62.5 } },
      { id: 'S3', kind: 'iso', foc: 'P', name: 'izolovaná dimenzia P', meas: 'Vyváženie linky metódou Yamazumi a štandardizovaná práca bez zmeny prepojenia s MES', I: { T: .79, S: .64, P: .70 }, q: { TS: .72, SP: .63, PT: .43 }, Y: 37.2, cost: 60, ad: { T1: 12, T5: 14, P5: 7.5, S1: 43.75 } },
      { id: 'S4', kind: 'int', foc: 'PT', name: 'integrovaný, hrana P–T', meas: 'Opatrenia S1 až S3 zladené cez riadenie a digitálnu integráciu: prepojenie všetkých staníc s MES, sekvencovanie variantov podľa času prestavieb, prediktívna údržba', I: { T: .85, S: .74, P: .72 }, q: { TS: .76, SP: .64, PT: .80 }, Y: 40.1, cost: 190, ad: { T1: 7, T5: 9, P5: 4, S1: 62.5 } },
      { id: 'S5', kind: 'int', foc: 'SP', name: 'integrovaný, hrana S–P', meas: 'Opatrenia zladené cez organizáciu práce: rotácia podľa kvalifikačnej matice, štandardy tvorené s operátormi, vyváženie podľa ergonomickej záťaže', I: { T: .80, S: .72, P: .70 }, q: { TS: .74, SP: .78, PT: .47 }, Y: 39.1, cost: 185, ad: { T1: 11, T5: 13, P5: 7, S1: 68.75 } },
      { id: 'S6', kind: 'int', foc: 'TS', name: 'integrovaný, hrana T–S', meas: 'Opatrenia zladené cez rozhranie človek–technika: asistenčné systémy na manuálnych staniciach, zaškolenie operátorov na novú techniku', I: { T: .82, S: .73, P: .64 }, q: { TS: .84, SP: .67, PT: .44 }, Y: 38.7, cost: 195, ad: { T1: 10, T5: 12, P5: 8.5, S1: 62.5 } }
    ],
    cardScen: 'S4', months: 6,
    plan: [
      { m: 'Prepojenie všetkých staníc s MES', e: 'P–T', r: 'Technológ', t: 'mesiac 1–4' },
      { m: 'Sekvencovanie variantov podľa času prestavieb', e: 'P–T', r: 'Plánovač výroby', t: 'mesiac 1–2' },
      { m: 'Prediktívna údržba kritických staníc', e: 'P–T', r: 'Údržba', t: 'mesiac 3–5' }
    ]
  };
}

/* Vzorové údaje linky Y pred verziou 2.3.0 → hodnoty po prepočte modelu v práci (tab. 6.24 až 6.29).
   Pri otvorení staršieho projektu sa vo vzorovej linke Y zmenia len bunky, ktoré majú ešte pôvodnú hodnotu. */
const Y_SAMPLE_UPDATE = {
  ind: { T2: [88, 83.33], S1: [45, 43.75] },
  edge: { SP1: [65, 66.7] },
  direct: { T: [0.80, 0.79], SP: [0.59, 0.60] },
  adapt: { S1: [45, 43.75] },
  scen: {
    S1: { I: { T: [.85, .84] }, q: { SP: [.59, .60] }, ad: { S1: [45, 43.75] } },
    S2: { I: { T: [.80, .79] }, q: { SP: [.63, .64] }, ad: { S1: [62, 62.5] } },
    S3: { I: { T: [.80, .79] }, q: { SP: [.62, .63] }, ad: { S1: [45, 43.75] } },
    S4: { I: { T: [.84, .85], S: [.68, .74] }, q: { SP: [.63, .64] }, ad: { S1: [58, 62.5] } },
    S5: { I: { T: [.81, .80] }, ad: { S1: [68, 68.75] } },
    S6: { I: { T: [.83, .82] }, q: { SP: [.66, .67] }, ad: { S1: [62, 62.5] } }
  }
};
function updateSampleY(l) {
  if (!l || !l.builtin || !/^Y(-|$)/.test(String(l.id))) return 0;
  const U = Y_SAMPLE_UPDATE; let n = 0;
  const val = (o, m) => { if (o) for (const k in m) if (o[k] === m[k][0]) { o[k] = m[k][1]; n++; } };
  const meas = (o, m) => { if (o) for (const k in m) if (o[k] && o[k].x === m[k][0]) { o[k].x = m[k][1]; n++; } };
  meas(l.ind, U.ind); meas(l.edge, U.edge); val(l.direct, U.direct); val(l.adapt, U.adapt);
  (l.scen || []).forEach(sc => { const m = U.scen[sc.id]; if (m) { val(sc.I, m.I || {}); val(sc.q, m.q || {}); val(sc.ad, m.ad || {}); } });
  return n;
}

/* Nová prázdna linka: predvolené referenčné a cieľové hodnoty a váhy (tab. 6.24), bez nameraných hodnôt */
function emptyLine(id, name) {
  const ind = yIndicators(), edge = yEdges();
  Object.values(ind).forEach(v => { v.x = null; });
  Object.values(edge).forEach(v => { v.x = null; });
  return {
    id, name, sub: '', auditDate: '', auditor: '', builtin: false, mode: 'ind', ind, edge, info: [],
    direct: { T: null, S: null, P: null, TS: null, SP: null, PT: null },
    adapt: { T1: null, T5: null, P5: null, S1: null },
    prod: { Q: null, N: null, t: 7.5 },
    dem: [[[0, 0, 0], [0, 0, 0], [0, 0, 0]]], demNote: 'Hodnotenie panelu expertov podniku',
    valid: { sim: null, real: null }, scen: [], cardScen: '', months: 6, plan: []
  };
}

/* Tab. 6.1 – osem krokov */
const STEPS = [
  { n: 1, t: 'Vymedzenie systému a cieľov', what: 'Vymedzí sa linka, sortiment variantov a cieľový ukazovateľ (produktivita Y); pre každý indikátor sa určí referenčná a cieľová hodnota.', res: 'Cieľový ukazovateľ Y, výkonnosť δY a index adaptability A, vzťahy (6.19) až (6.22)', ch: '6.8.1', go: 'audit', mape: 'M' },
  { n: 2, t: 'Analýza východiskového stavu', what: 'Na linke sa zmeria všetkých 15 indikátorov, päť pre každú z dimenzií T, S a P.', res: 'Hodnoty indikátorov; LBE (6.23), OEE (6.24), IF (6.25)', ch: '6.4, 6.8.2', go: 'audit', mape: 'M' },
  { n: 3, t: 'Výpočet indexov dimenzií', what: 'Indikátory sa normalizujú na škálu 0 až 1 a vážia metódou AHP; z nich sa vypočíta index každej dimenzie.', res: 'Indexy I(t), I(s), I(p), vzťahy (6.1) až (6.3); CR ≤ 0,10 (6.27)', ch: '6.6.1, 6.6.2, 6.8.3', go: 'ahp', mape: 'A' },
  { n: 4, t: 'Zostavenie triangulačnej matice', what: 'Pre každú hranu sa určí kvalita väzby z indikátorov hrany a expertný panel ohodnotí intenzitu väzieb.', res: 'Kvalita väzby q(ij), vzťah (6.28); matica väzieb', ch: '6.5, 6.8.4', go: 'dematel', mape: 'A' },
  { n: 5, t: 'Diagnostika', what: 'Vypočíta sa príspevok každej hrany a ich priemer TSI; hrana s najnižším príspevkom je najslabšia väzba; DEMATEL určí hnaciu a závislú dimenziu.', res: 'e(ij) (6.7), TSI (6.8), e(min) (6.29), DEMATEL (6.12) až (6.16)', ch: '6.6.3, 6.6.4, 6.6.6, 6.8.5', go: 'audit', mape: 'A' },
  { n: 6, t: 'Návrh a simulačné overenie opatrení', what: 'Na najslabšiu hranu sa navrhnú opatrenia a v simulačnom modeli linky sa porovnajú scenáre; model sa najprv validuje voči skutočnému stavu linky.', res: 'Odchýlka simulácie δ ≤ 5 % (6.30); prírastok ΔTSI (6.11)', ch: '6.8.6, 6.9.2', go: 'scenare', mape: 'P' },
  { n: 7, t: 'Pilotná implementácia', what: 'Vybraný scenár sa zavedie ako pilot; rozdiel produktivity pred zmenou a po nej sa otestuje Welchovým t-testom.', res: 'Testovacia štatistika t, vzťah (6.31)', ch: '6.8.7', go: 'vyhodnotenie', mape: 'E' },
  { n: 8, t: 'Vyhodnotenie a štandardizácia', what: 'Vypočíta sa TSI po zmene a koeficient synergie κ; κ > 1 znamená, že integrované opatrenia priniesli viac než súčet izolovaných.', res: 'Koeficient κ (6.18); interval spoľahlivosti (6.32)', ch: '6.6.7, 6.8.8', go: 'vyhodnotenie', mape: 'K' }
];

/* Tab. 6.14 – fázy adaptačného cyklu */
const CYCLE = [
  { n: 1, t: 'Monitorovanie', mk: 'Monitor', orig: 'Zber údajov o stave systému a jeho okolia', d: 'Priebežný zber indikátorov a zachytenie impulzu zmeny (nový variant, zmena objemu, výpadok zdroja, nová technológia).', tools: 'Indikátory T1 až P5, dáta z MES', pdca: '—' },
  { n: 2, t: 'Diagnostika', mk: 'Analyze', orig: 'Porovnanie stavu s cieľmi, zistenie potreby zmeny', d: 'Výpočet indexov dimenzií a TSI, identifikácia najslabšej hrany a hnacej dimenzie.', tools: 'I(k), TSI, B, e(ij), DEMATEL', pdca: '—' },
  { n: 3, t: 'Návrh opatrenia', mk: 'Plan', orig: 'Výber a príprava zásahu', d: 'Výber opatrenia na najslabšiu hranu a overenie jeho variantov simuláciou.', tools: 'Opatrenia na najslabšiu hranu, simulácia scenárov', pdca: 'Plan' },
  { n: 4, t: 'Realizácia', mk: 'Execute', orig: 'Uplatnenie zásahu v riadenom systéme', d: 'Pilotné zavedenie na linke a stabilizácia.', tools: 'Pilotné zavedenie, stabilizácia procesu', pdca: 'Do' },
  { n: 5, t: 'Vyhodnotenie', mk: 'rozšírenie modelu', orig: 'V pôvodnej schéme MAPE-K chýba; vložené preto, lebo účinok zmeny sa dá posúdiť až po stabilizácii procesu', d: 'Porovnanie TSI pred a po zmene a výpočet koeficientu κ.', tools: 'ΔTSI (6.11), κ (6.18), štatistický test (6.31)', pdca: 'Check' },
  { n: 6, t: 'Učenie', mk: 'Knowledge', orig: 'Zdieľaná báza modelov, pravidiel a skúseností', d: 'Štandardizácia osvedčeného riešenia a jeho uloženie do znalostnej bázy, ktorá sa využije v ďalšom cykle.', tools: 'Štandardy, znalostná báza riešení', pdca: 'Act' }
];

/* Tab. 6.13 – riadiace úrovne */
const LEVELS = [
  { t: 'Strategická', typ: 'Štrukturálna: zmena koncepcie linky, investície', own: 'Vedenie závodu', fr: 'Polročne až ročne', dec: 'Investície do techniky, rozvoj kompetencií, portfólio variantov', kpi: 'TSI, B, κ' },
  { t: 'Taktická', typ: 'Konfiguračná: rekonfigurácia staníc, kapacity, kvalifikácie', own: 'Priemyselný inžinier, vedúci výroby', fr: 'Mesačne', dec: 'Vyváženie linky, plán školení, aktualizácia štandardov', kpi: 'I(t), I(s), I(p), najslabšia hrana' },
  { t: 'Operatívna', typ: 'Parametrická: takt, priradenie ľudí, sekvencia variantov', own: 'Majster, tímlíder', fr: 'Denne až v rámci zmeny', dec: 'Obsadenie staníc, riešenie odchýlok, prestavby', kpi: 'Indikátory T1 až P5' }
];

/* Tab. 6.35 – audit synergie */
const AUDIT = [
  { t: 'Príprava', act: 'Vymedzenie linky a cieľov, výber indikátorov, stanovenie referenčných a cieľových hodnôt, zber dostupných dát z MES a z evidencie kvality', who: 'Vedúci výroby, audítor', dur: '1 týždeň', out: 'Plán auditu, zoznam dát', w: 5 },
  { t: 'Meranie na linke', act: 'Časové snímky a diagram Yamazumi, pozorovanie prestavieb, ergonomické hodnotenie, aktualizácia kvalifikačnej matice, dotazník akceptácie technológií', who: 'Audítor, tímlíder, operátori', dur: '1 až 2 týždne', out: 'Hodnoty indikátorov T1 až P5 a indikátorov hrán', w: 8 },
  { t: 'Expertný workshop', act: 'Hodnotenie intenzít väzieb a(ij), párové porovnanie indikátorov metódou AHP, kontrola konzistencie', who: 'Panel 5 až 9 expertov', dur: '1 deň', out: 'Matica A, váhy w(kj)', w: 1 },
  { t: 'Vyhodnotenie', act: 'Výpočet I(k), q(ij), e(ij), TSI, B a DEMATEL, zaradenie podľa škály TSI', who: 'Audítor', dur: '2 až 3 dni', out: 'Karta synergie linky', w: 2.5 },
  { t: 'Akčný plán', act: 'Prezentácia výsledkov, výber 3 až 5 opatrení na najslabšiu hranu, určenie zodpovedností a termínov', who: 'Vedenie závodu, tím linky', dur: '1 workshop', out: 'Akčný plán, termín opakovaného auditu', w: 1 },
  { t: 'Opakovaný audit', act: 'Opätovné meranie a výpočet po stabilizácii opatrení', who: 'Audítor', dur: '1 týždeň, po 3 až 6 mesiacoch', out: 'ΔTSI, trend synergie', w: 5 }
];

/* Tab. 6.6 – typické situácie */
const SITUATIONS = [
  { s: 'Zavedenie nového variantu výrobku', m: 'Čas prestavby, kvalifikačná matica, čas reakcie na zmenu plánu (T1, S1, P5)', c: 'TSI a príspevky hrán pred zmenou a po nej', d: 'Či je linka na variant pripravená a ktorú hranu treba posilniť pred spustením' },
  { s: 'Kolísanie objemu výroby', m: 'Vyváženie linky, flexibilita pracovníkov, čas rekonfigurácie kapacity (P1, S1, T5)', c: 'Indexy dimenzií a koeficient vyváženosti B', d: 'Či stačí preskupiť ľudí (hrana S–P), alebo treba meniť techniku (dimenzia T)' },
  { s: 'Nedostatok alebo fluktuácia pracovníkov', m: 'Flexibilita a stabilita pracovnej sily, podiel operátorov v rotácii (S1, S5)', c: 'Príspevok hrany S–P a úloha dimenzie S podľa DEMATEL', d: 'Kam investovať: do kvalifikácie, štandardov alebo organizácie práce' },
  { s: 'Investícia do technológie (robot, asistenčný systém)', m: 'Akceptácia technológií, ergonómia, digitálna konektivita (S4, S2, T4)', c: 'Prírastok ΔTSI scenára a efektívnosť investície η', d: 'Výber scenára s najvyšším prírastkom synergie na jednotku nákladov' },
  { s: 'Porovnanie liniek alebo závodov', m: 'Rovnaké indikátory, váhy a referenčné hodnoty na všetkých linkách', c: 'TSI jednotlivých liniek', d: 'Určí sa vzorová linka a prenesú sa osvedčené riešenia' }
];

/* Tab. 6.2 – pojmy a analógie */
const GLOSSARY = [
  ['Dimenzie T, S a P', 'Tri oblasti linky: technika, ľudia a organizácia procesu', 'Kategórie stroj, človek a metóda v diagrame príčin a následkov (4M)'],
  ['Indikátor a index dimenzie', 'Päť meraní pre každú oblasť, prevedených na škálu 0 až 1 a spojených váženým priemerom', 'Bodové hodnotenie pri audite pracoviska alebo dodávateľa'],
  ['Hrana a kvalita väzby q', 'Rozhranie dvoch oblastí; do akej miery sú zavedené nástroje rozhrania', 'Rozhrania medzi útvarmi, kde vznikajú straty z nezladenosti'],
  ['Príspevok hrany e a index TSI', 'Súčin kvality väzby a indexov dvoch oblastí; TSI je priemer troch hrán', 'OEE: slabý činiteľ stiahne celý výsledok'],
  ['Najslabšia hrana', 'Väzba s najmenším príspevkom, na ktorú sa opatrenia smerujú ako prvé', 'Úzke miesto linky'],
  ['Koeficient vyváženosti B', 'Ako rovnomerne sú rozvinuté tri oblasti', 'Vyváženie linky: rovnomerné zaťaženie staníc'],
  ['Izolovaný a integrovaný scenár', 'Opatrenia v jednej dimenzii oproti opatreniam vo všetkých troch zladeným cez jednu väzbu', 'Samostatné projekty oproti koordinovanému programu zlepšovania'],
  ['Koeficient synergie κ', 'Prírastok produktivity spoločných opatrení / súčet prírastkov samostatných', 'Porovnanie pred a po pri projektoch kaizen'],
  ['Hnacia a závislá dimenzia', 'Ktorá oblasť ovplyvňuje ostatné a ktorá sa mení v dôsledku iných', 'Odlíšenie príčiny od symptómu'],
  ['Váhy indikátorov (AHP)', 'Dôležitosť indikátorov určená párovým porovnaním', 'Párové porovnanie kritérií pri výbere variantu'],
  ['Adaptačný cyklus (MAPE-K)', 'Meranie, diagnostika, návrh, realizácia, vyhodnotenie, štandardizácia', 'Cyklus PDCA s ukladaním riešení do štandardov'],
  ['Audit a karta synergie', 'Zhodnotenie linky za 3 až 4 týždne so súhrnom na jednej strane', 'Audit linky so správou A3']
];

/* Saatyho škála a RI */
const SAATY = [9, 8, 7, 6, 5, 4, 3, 2, 1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8, 1 / 9];
const RI = { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32 };

/* Tab. 6.9 – obsah polí triangulačnej matice (riadok pôsobí na stĺpec) */
const MATRIX_TXT = {
  T: { T: 'Vnútorná koherencia techniky: kompatibilita rozhraní, jednotná dátová platforma', S: 'Technika mení nároky na pracovníkov: ergonómia, kognitívna záťaž, potreba kvalifikácie', P: 'Technika určuje možnosti procesu: čas prestavby, dostupnosť, minimálny takt' },
  S: { T: 'Pracovníci určujú využitie techniky: obsluha, údržba, akceptácia, podnety na zlepšenie', S: 'Vnútorná koherencia ľudského subsystému: tímová spolupráca, kultúra, motivácia', P: 'Ľudia určujú stabilitu procesu: chybovosť, variabilita časov, flexibilné obsadenie staníc' },
  P: { T: 'Proces určuje požiadavky na techniku: sekvencia variantov, plán údržby, konfigurácia staníc', S: 'Organizácia určuje pracovné podmienky: rotácia, normy, zmenovosť, zaťaženie', P: 'Vnútorná koherencia procesu: nadväznosť operácií, vyváženie, informačné toky' }
};

/* Tab. 6.5 – špecifiká modelu */
const SPECIFICS = [
  ['Predmet hodnotenia', 'Samostatné ukazovatele (OEE, vyváženie linky, ergonómia)', 'Tri dimenzie a väzby medzi nimi (hrany)'],
  ['Miesto zásahu', 'Najslabší ukazovateľ alebo najslabšia dimenzia', 'Najslabšia hrana s najnižším príspevkom e(ij)'],
  ['Výsledok', 'Súbor ukazovateľov, ktoré nemožno navzájom porovnať', 'Jedno číslo TSI 0 až 1 s rozkladom na príspevky hrán'],
  ['Dôkaz synergie', 'Súčet izolovaných efektov', 'Koeficient synergie κ a jeho interval spoľahlivosti'],
  ['Použitie v čase', 'Jednorazový audit alebo ročné hodnotenie', 'Adaptačný cyklus MAPE-K a opakované meranie po zásahu'],
  ['Údaje', 'Rôzne metodiky a špecializované merania', '15 indikátorov z bežne dostupných dát a expertná matica väzieb']
];

/* Ukážkové matice AHP (horný trojuholník). Práca uvádza len výsledné váhy (tab. 6.24);
   tieto porovnania sú zaokrúhlením pomerov váh na Saatyho škálu. */
const AHP_EXAMPLE = {
  T: [[2, 1, 3, 2], [1 / 2, 2, 1], [3, 2], [1 / 2]],
  S: [[1 / 2, 1, 2, 2], [2, 3, 4], [2, 2], [1]],
  P: [[1, 2, 2, 1 / 2], [2, 2, 1 / 2], [1, 1 / 3], [1 / 3]]
};
