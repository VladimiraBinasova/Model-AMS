/* ===== Pohľady: AHP, DEMATEL, Scenáre ===== */

/* ---------- AHP ---------- */
function ahpMatrix(dim) {
  const up = S.ahp[dim], M = [];
  for (let i = 0; i < 5; i++) { M.push([]); for (let j = 0; j < 5; j++) M[i].push(i === j ? 1 : i < j ? up[i][j - i - 1] : 1 / up[j][i - j - 1]); }
  return M;
}
VIEWS.ahp = {
  t: 'Váhy indikátorov (AHP)', sub: 'Krok 3 metodiky · párové porovnanie a kontrola konzistencie',
  html() {
    const d = ui.ahpDim, inds = INDICATORS.filter(i => i.d === d), up = S.ahp[d];
    const opt = (v) => SAATY.map((s, i) => `<option value="${i}" ${Math.abs(s - v) < 1e-9 ? 'selected' : ''}>${saatyLab(s)}</option>`).join('');
    return `
    <p class="intro">Experti pri každej dvojici indikátorov určia, ktorý je pre linku dôležitejší a koľkokrát (Saatyho škála 1 až 9). Váhy sú zložkami hlavného vlastného vektora matice; porovnanie sa použije len vtedy, ak je pomer konzistencie CR ≤ 0,10.</p>
    <div class="row" style="justify-content:space-between">
      <div class="seg">${DIM_KEYS.map(k => `<button data-act="ahpdim" data-v="${k}" class="${k === d ? 'on' : ''}">${k} · ${DIMS[k].name}</button>`).join('')}</div>
      <div class="row"><button class="btn" data-act="ahpex">Ukážkové porovnanie</button><button class="btn" data-act="ahpones">Všetky rovnako dôležité</button></div>
    </div>
    <div class="note small">Práca uvádza len výsledné váhy linky Y (tab. 6.24) a pomery konzistencie (T 0,003; S 0,010; P 0,021). Ukážkové porovnania sú pomery týchto váh zaokrúhlené na Saatyho škálu, preto sa výsledok od tabuľky mierne líši.</div>
    <div class="grid g-main">
      <div class="card">
        <div class="card-h"><h2>Matica párového porovnania · dimenzia ${d}</h2><span class="small muted">riadok oproti stĺpcu</span></div>
        <div class="tbl-wrap"><table><thead><tr><th></th>${inds.map(i => `<th class="c" title="${i.n}">${i.c}</th>`).join('')}</tr></thead><tbody>
        ${inds.map((ri, i) => `<tr><td title="${ri.n}"><b>${ri.c}</b> <span class="small muted">${ri.n}</span></td>${inds.map((cj, j) => i === j ? '<td class="c muted">1</td>' : i < j ? `<td class="c"><select class="inp" id="ahp-${i}-${j}" data-in="A:${i}:${j}" aria-label="${ri.c} oproti ${cj.c}">${opt(up[i][j - i - 1])}</select></td>` : `<td class="c muted" data-r="ahpc:${i}-${j}"></td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
        <p class="small muted">1 rovnako dôležité · 3 mierne dôležitejšie · 5 silne · 7 veľmi silne · 9 extrémne; 2, 4, 6, 8 sú medzistupne. Dolný trojuholník sa dopočíta ako prevrátená hodnota.</p>
      </div>
      <div class="card" data-r="ahpres"></div>
    </div>`;
  },
  R: {
    ahpc: a => { const [i, j] = a.split('-').map(Number); return saatyLab(1 / S.ahp[ui.ahpDim][j][i - j - 1]); },
    ahpres() {
      const d = ui.ahpDim, r = ahp(ahpMatrix(d)), inds = INDICATORS.filter(i => i.d === d), l = line(), ok = r.CR <= 0.10;
      const canApply = l.mode === 'ind' && l.ind;
      return `<div class="card-h"><h2>Váhy a konzistencia</h2><span class="pill ${ok ? 'good' : 'bad'}">${ok ? 'konzistentné' : 'nekonzistentné'}</span></div>
        <div class="tbl-wrap"><table><thead><tr><th>Indikátor</th><th>Váha w</th><th class="r">${esc(l.name)}</th></tr></thead><tbody>
        ${inds.map((i, k) => `<tr><td><b>${i.c}</b> <span class="small">${i.n}</span></td><td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="nbar" style="width:90px"><i style="width:${(r.w[k] * 100 / Math.max(...r.w)).toFixed(0)}%"></i></div><b>${fmt(r.w[k], 3)}</b></div></td><td class="r muted">${canApply ? fmt(l.ind[i.c].w) : '—'}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="grid g3">
          <div class="tile"><span class="lab">λmax</span><span class="val" style="font-size:22px">${fmt(r.lmax, 3)}</span></div>
          <div class="tile"><span class="lab">CI (6.26)</span><span class="val" style="font-size:22px">${fmt(r.CI, 3)}</span></div>
          <div class="tile"><span class="lab">CR = CI / 1,12 (6.27)</span><span class="val" style="font-size:22px;color:var(--${ok ? 'good' : 'bad'})">${fmt(r.CR, 3)}</span></div>
        </div>
        ${ok ? '' : '<div class="note bad">Pomer konzistencie prekračuje 0,10: hodnotenia si protirečia (napr. A > B, B > C, ale C > A). Upravte porovnania, ktoré najviac odporujú ostatným.</div>'}
        <div class="row"><button class="btn pri" data-act="ahpapply" ${canApply && ok ? '' : 'disabled'}>Použiť váhy v audite</button>
        <span class="small muted">${canApply ? (ok ? 'Váhy sa zapíšu do auditu (zaokrúhlené na 2 desatinné miesta).' : 'Najprv dosiahnite CR ≤ 0,10.') : 'Váhy sa uplatnia len pri vstupe cez indikátory.'}</span></div>`;
    }
  }
};

/* ---------- DEMATEL ---------- */
const mtx = (M, d = 2, hl) => `<table class="num" style="width:auto"><thead><tr><th></th>${DIM_KEYS.map(k => `<th class="r">${k}</th>`).join('')}</tr></thead><tbody>${M.map((r, i) => `<tr><td><b>${DIM_KEYS[i]}</b></td>${r.map(v => `<td class="r">${fmt(v, d)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
VIEWS.dematel = {
  t: 'Hnacie a závislé dimenzie', sub: 'Krok 4 a 5 · metóda DEMATEL, vzťahy (6.12) až (6.16)',
  html() {
    const l = line(), H = l.dem.length; if (ui.demExp >= H) ui.demExp = 0;
    const M = l.dem[ui.demExp], lab = ['0 žiadny', '1 slabý', '2 stredný', '3 silný', '4 veľmi silný'];
    return `
    <p class="intro">Experti pri každej dvojici dimenzií odpovedia, ako silno zmena v jednej oblasti ovplyvní druhú (0 až 4). Výpočet zachytí aj nepriame vplyvy cez tretiu dimenziu a určí, ktorá oblasť ostatné ťahá (hnacia) a ktorá sa mení až v dôsledku zmien v ostatných (závislá).</p>
    <div class="grid g-main">
      <div class="card">
        <div class="card-h"><h2>Priama matica vplyvov A(h)</h2><span class="small muted">riadok pôsobí na stĺpec</span></div>
        <div class="row">${l.dem.map((_, h) => `<button class="chip ${h === ui.demExp ? 'on' : ''}" data-act="demexp" data-v="${h}">${H === 1 ? 'Panel (priemer)' : 'Expert ' + (h + 1)}</button>`).join('')}
          <button class="btn ghost" data-act="demadd">+ Pridať experta</button>${H > 1 ? '<button class="btn ghost danger" data-act="demdel">Odstrániť zvoleného</button>' : ''}</div>
        <div class="tbl-wrap"><table><thead><tr><th>Pôsobí ↓ / ovplyvňuje →</th>${DIM_KEYS.map(k => `<th class="c" title="${DIMS[k].name}">${k}</th>`).join('')}</tr></thead><tbody>
        ${DIM_KEYS.map((ri, i) => `<tr><td><b>${ri}</b> · ${DIMS[ri].name}</td>${DIM_KEYS.map((cj, j) => i === j ? '<td class="c muted">—</td>' : `<td class="c"><select class="inp" id="dm-${i}-${j}" data-in="D:${i}:${j}" aria-label="${ri} na ${cj}" title="${esc(MATRIX_TXT[ri][cj])}">${lab.map((t, v) => `<option value="${v}" ${M[i][j] === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
        <p class="small muted">${esc(l.demNote || 'Vlastné hodnotenie panelu')}. Panel 5 až 9 expertov (výroba, technológia, údržba, personalistika, kvalita); matice expertov sa spriemerujú podľa (6.12). Prejdite myšou nad bunku pre obsah väzby z tab. 6.9.</p>
      </div>
      <div class="card"><div class="card-h"><h2>Príčinný diagram</h2><span class="small muted">${esc(l.name)}</span></div><div data-r="dcausal"></div></div>
    </div>
    <div class="card" data-r="droles"></div>
    <div class="card" data-r="dsteps"></div>
    <div class="card" data-r="dloo"></div>`;
  },
  R: {
    dcausal() { if (!C.dem.ok) return '<p class="muted">Matica je prázdna.</p>'; const others = S.lines.filter(l => l.id !== line().id).map(l => ({ name: l.name, role: st(l).dem.role, dash: true })).filter(o => o.role); return causal([{ name: line().name, role: C.dem.role }, ...others]) + `<p class="small muted">Plné body: ${esc(line().name)}; prázdne štvorce: ostatné linky.</p>`; },
    droles() {
      const D = C.dem; if (!D.ok) return '';
      const mxr = Math.max(...DIM_KEYS.map(k => D.role[k].r)), mxd = Math.max(...DIM_KEYS.map(k => D.role[k].d));
      const interp = k => { const p = D.role[k]; const a = p.r > 0 ? 'Hnacia' : 'Závislá'; const b = []; if (p.r === mxr && p.r > 0) b.push('najsilnejšie'); else if (p.r > 0) b.push('slabšie'); if (p.d === mxd) b.push('najprepojenejšia'); return a + (b.length ? ', ' + b.join(', ') : ''); };
      return `<div class="card-h"><h2>Úloha dimenzií</h2><span class="mono muted">d = R + C · r = R − C (6.16)</span></div>
        <div class="tbl-wrap"><table><thead><tr><th>Dimenzia</th><th class="r">R (pôsobenie)</th><th class="r">C (prijímanie)</th><th class="r">d (dôležitosť)</th><th class="r">r (úloha)</th><th>Interpretácia</th></tr></thead><tbody>
        ${DIM_KEYS.map(k => { const p = D.role[k]; return `<tr><td><b>${k}</b> · ${DIMS[k].name}</td><td class="r">${fmt(p.R)}</td><td class="r">${fmt(p.C)}</td><td class="r">${fmt(p.d)}</td><td class="r"><b style="color:var(--${p.r > 0 ? 'accent' : 'warn'})">${sgn(p.r)}</b></td><td><span class="pill ${p.r > 0 ? 'acc' : 'warn'}">${interp(k)}</span></td></tr>`; }).join('')}
        </tbody></table></div>
        <div class="note ${advice(C).kind === 'warn' ? 'warn' : ''}">${advice(C).txt}</div>`;
    },
    dsteps() {
      const D = C.dem; if (!D.ok) return '';
      return `<div class="card-h"><h2>Postup výpočtu</h2><span class="small muted">s = najväčší riadkový alebo stĺpcový súčet matice A</span></div>
        <div class="grid g3">
          <div class="stack"><h3>1 · Priemerná matica A (6.12)</h3><div class="tbl-wrap">${mtx(D.A, 2)}</div></div>
          <div class="stack"><h3>2 · Normalizácia D = A / s (6.13)</h3><div class="tbl-wrap">${mtx(D.D, 3)}</div><span class="small muted">s = ${fmt(D.s, 2)}</span></div>
          <div class="stack"><h3>3 · Celkové vplyvy M = D(E − D)⁻¹ (6.14)</h3><div class="tbl-wrap">${mtx(D.M, 3)}</div><span class="small muted">M = D + D² + D³ + … zachytáva aj nepriame vplyvy</span></div>
        </div>`;
    },
    dloo() {
      const l = line(), H = l.dem.length;
      if (H < 2) return `<div class="card-h"><h2>Robustnosť poradia</h2></div><p class="small muted">Pri malom počte faktorov sa odporúča overiť, či sa poradie hnacích a závislých dimenzií nezmení, keď sa vynechá hodnotenie jedného experta. Pridajte matice jednotlivých expertov (tlačidlo „Pridať experta“) a kontrola sa zobrazí tu.</p>`;
      const base = DIM_KEYS.map(k => C.dem.role[k].r > 0).join();
      const rows = l.dem.map((_, h) => { const d = dematel(l.dem.filter((__, i) => i !== h)); const sig = DIM_KEYS.map(k => d.role[k].r > 0).join(); return { h, d, same: sig === base && d.driver === C.dem.driver }; });
      return `<div class="card-h"><h2>Robustnosť: vynechanie jedného experta</h2><span class="pill ${rows.every(r => r.same) ? 'good' : 'warn'}">${rows.every(r => r.same) ? 'poradie stabilné' : 'poradie sa mení'}</span></div>
        <div class="tbl-wrap"><table><thead><tr><th>Vynechaný</th>${DIM_KEYS.map(k => `<th class="r">r(${k})</th>`).join('')}<th>Hnacia</th><th>Zhoda</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>Expert ${r.h + 1}</td>${DIM_KEYS.map(k => `<td class="r">${sgn(r.d.role[k].r)}</td>`).join('')}<td>${r.d.driver}</td><td><span class="pill ${r.same ? 'good' : 'warn'}">${r.same ? 'áno' : 'nie'}</span></td></tr>`).join('')}</tbody></table></div>`;
    }
  }
};

/* ---------- SCENÁRE ---------- */
function adaptRefs(l) { if (l.mode === 'ind' && l.ind) { const r = {}; ['T1', 'T5', 'P5', 'S1'].forEach(k => r[k] = [l.ind[k].x0, l.ind[k].xs]); return r; } return ADAPT_REF; }
function scState(sc, l) { const syn = synergy(sc.I, sc.q); return { ...syn, I: sc.I, q: sc.q, A: adaptIndex(sc.ad, adaptRefs(l)) }; }
/* Pri zaokrúhľovaní ako v práci sa rozdiely počítajú zo zaokrúhlených hodnôt (TSI na 3, A na 2 desatinné miesta) */
const rT = v => S.round2 ? rnd(v, 3) : v, rA = v => S.round2 ? r2(v) : v, r1 = v => S.round2 ? rnd(v, 1) : v;
function scenSummary(l, s0) {
  l = l || line(); s0 = s0 || st(l);
  const rows = l.scen.map((sc, i) => { const s = scState(sc, l); const dT = rT(s.TSI) - rT(s0.TSI);
    return { sc, i, s, dT, dY: fin(sc.Y) && fin(s0.Y) ? sc.Y - r1(s0.Y) : null, eta: fin(sc.cost) && sc.cost > 0 ? dT / sc.cost * 100 : null, dA: s.A.A != null && s0.A.A != null ? rA(s.A.A) - rA(s0.A.A) : null }; });
  const ints = rows.filter(r => r.sc.kind === 'int');
  const target = ints.find(r => r.sc.foc === s0.weak);
  const best = ints.slice().sort((a, b) => b.dT - a.dT)[0];
  const iso = { T: rows.find(r => r.sc.kind === 'iso' && r.sc.foc === 'T'), S: rows.find(r => r.sc.kind === 'iso' && r.sc.foc === 'S'), P: rows.find(r => r.sc.kind === 'iso' && r.sc.foc === 'P') };
  return { rows, ints, target, best, iso };
}
function kappaOf(sum, intRow) {
  if (!intRow || !fin(intRow.dY)) return null;
  const parts = ['T', 'S', 'P'].map(k => sum.iso[k]);
  if (parts.some(p => !p || !fin(p.dY))) return null;
  const den = parts.reduce((a, p) => a + p.dY, 0);
  return { parts, den, num: intRow.dY, k: Math.abs(den) > 1e-9 ? intRow.dY / den : null };
}
function kappaChart(kp, intId) {
  const W = 460, H = 240, pb = 30, pt = 18, base = H - pb, mx = Math.max(kp.den, kp.num, 0.01) * 1.18, Y = v => (H - pb - pt) * v / mx;
  const shades = ['var(--iso)', 'color-mix(in srgb, var(--iso) 70%, var(--surface))', 'color-mix(in srgb, var(--iso) 45%, var(--surface))'];
  let g = `<line x1="20" x2="${W - 10}" y1="${base}" y2="${base}" class="ax"/>`;
  let y = base;
  kp.parts.forEach((p, i) => { const h = Y(Math.max(0, p.dY)); y -= h; g += `<rect x="70" y="${y}" width="110" height="${h}" style="fill:${shades[i]}" stroke="var(--surface)"/>`; if (h > 14) g += `<text x="125" y="${y + h / 2 + 4}" text-anchor="middle" font-size="12">${p.sc.id} ${sgn(p.dY, 1)}</text>`; });
  g += `<text x="125" y="${y - 6}" text-anchor="middle" font-size="12" font-weight="700">Σ ${sgn(kp.den, 1)}</text><text x="125" y="${H - 9}" text-anchor="middle" font-size="12">Súčet izolovaných</text>`;
  const hs = Y(Math.min(kp.num, kp.den)), hn = Y(Math.max(0, kp.num));
  g += `<rect x="270" y="${base - hn}" width="110" height="${hn}" style="fill:var(--accent)"/>`;
  if (kp.num > kp.den) { g += `<rect x="270" y="${base - hs}" width="110" height="${hs}" style="fill:color-mix(in srgb, var(--accent) 35%, var(--surface))"/><text x="325" y="${base - hs / 2 + 4}" text-anchor="middle" font-size="12">= súčet izolovaných</text><text x="325" y="${base - hs - (hn - hs) / 2 + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--accent-ink)">synergia ${sgn(kp.num - kp.den, 1)}</text>`; }
  g += `<line x1="60" x2="${W - 40}" y1="${base - Y(kp.den)}" y2="${base - Y(kp.den)}" stroke="var(--muted)" stroke-dasharray="4 4"/>`;
  g += `<text x="325" y="${base - hn - 6}" text-anchor="middle" font-size="12" font-weight="700">${sgn(kp.num, 1)}</text><text x="325" y="${H - 9}" text-anchor="middle" font-size="12">Integrovaný ${intId}</text>`;
  return `<svg class="svgbox" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rozklad prírastku produktivity">${g}</svg>`;
}

VIEWS.scenare = {
  t: 'Scenáre a synergia', sub: 'Krok 6 metodiky · porovnanie scenárov, κ, η a predpoklady PP1, PP2',
  html() {
    const l = line(), ed = ui.scEdit;
    if (!l.scen.find(s => s.id === ui.scSel)) ui.scSel = l.scen.length ? l.scen[l.scen.length > 3 ? 3 : 0].id : null;
    const num = (i, path, v, d = 2) => ed ? `<input class="inp sm" inputmode="decimal" id="sc-${i}-${path}" value="${iv(v)}" data-in="SC:${i}:${path}" aria-label="${path}">` : fmt(v, d);
    const head = `<tr><th>Scenár</th><th class="r">I(t)</th><th class="r">I(s)</th><th class="r">I(p)</th><th class="r">q(ts)</th><th class="r">q(sp)</th><th class="r">q(pt)</th><th class="r">TSI</th><th class="r">ΔTSI</th><th class="r">B</th><th class="r">Y</th><th class="r">ΔY</th><th class="r">N [tis. €]</th><th class="r">η</th><th class="r">A</th><th class="r">ΔA</th>${ed ? '<th></th>' : ''}</tr>`;
    const s0 = `<tr><td><b>S0</b> <span class="small muted">východiskový stav (z auditu)</span></td>${DIM_KEYS.map(k => `<td class="r">${fmt(C.I[k])}</td>`).join('')}${EDGE_KEYS.map(k => `<td class="r">${fmt(C.q[k])}</td>`).join('')}<td class="r"><b>${fmt(C.TSI, 3)}</b></td><td class="r muted">—</td><td class="r">${fmt(C.B)}</td><td class="r">${fmt(C.Y, 1)}</td><td class="r muted">—</td><td class="r muted">—</td><td class="r muted">—</td><td class="r">${fmt(C.A.A)}</td><td class="r muted">—</td>${ed ? '<td></td>' : ''}</tr>`;
    const rows = l.scen.map((sc, i) => `<tr class="click ${ui.scSel === sc.id ? 'sel' : ''}" data-act="scsel" data-k="${sc.id}" data-row="${sc.id}">
      <td>${ed ? `<div class="row" style="gap:4px;flex-wrap:nowrap"><b>${sc.id}</b><select class="inp" data-in="SC:${i}:kind" data-t="s" aria-label="typ"><option value="iso" ${sc.kind === 'iso' ? 'selected' : ''}>izolovaný</option><option value="int" ${sc.kind === 'int' ? 'selected' : ''}>integrovaný</option></select><select class="inp" data-in="SC:${i}:foc" data-t="s" aria-label="zameranie">${(sc.kind === 'iso' ? DIM_KEYS : EDGE_KEYS).map(k => `<option value="${k}" ${sc.foc === k ? 'selected' : ''}>${elab(k)}</option>`).join('')}</select></div>`
        : `<b>${sc.id}</b> <span class="small">${esc(sc.name)}</span> ${sc.kind === 'int' && sc.foc === C.weak ? '<span class="pill acc">najslabšia hrana</span>' : ''}`}</td>
      ${DIM_KEYS.map(k => `<td class="r">${num(i, 'I.' + k, sc.I[k])}</td>`).join('')}${EDGE_KEYS.map(k => `<td class="r">${num(i, 'q.' + k, sc.q[k])}</td>`).join('')}
      <td class="r" data-r="sct:${i}"></td><td class="r" data-r="scd:${i}"></td><td class="r" data-r="scb:${i}"></td>
      <td class="r">${num(i, 'Y', sc.Y, 1)}</td><td class="r" data-r="scy:${i}"></td><td class="r">${num(i, 'cost', sc.cost, 0)}</td><td class="r" data-r="sce:${i}"></td><td class="r" data-r="sca:${i}"></td><td class="r" data-r="scda:${i}"></td>
      ${ed ? `<td><button class="btn ghost danger" data-act="scdel" data-v="${i}" aria-label="Odstrániť ${sc.id}">✕</button></td>` : ''}</tr>`).join('');
    const adRows = ed ? `<details open><summary>Indikátory adaptability v scenároch (T1 / T5 / P5 / S1)</summary><div><div class="tbl-wrap"><table><thead><tr><th>Scenár</th><th class="r">T1 [min]</th><th class="r">T5 [h]</th><th class="r">P5 [h]</th><th class="r">S1 [%]</th></tr></thead><tbody>${l.scen.map((sc, i) => `<tr><td><b>${sc.id}</b></td>${['T1', 'T5', 'P5', 'S1'].map(k => `<td class="r"><input class="inp sm" inputmode="decimal" value="${iv(sc.ad[k])}" data-in="SC:${i}:ad.${k}" aria-label="${sc.id} ${k}"></td>`).join('')}</tr>`).join('')}</tbody></table></div></div></details>` : '';
    return `
    <p class="intro">Izolovaný scenár obsahuje opatrenia len v jednej dimenzii; integrovaný zavádza opatrenia vo všetkých troch dimenziách naraz a zlaďuje ich cez jednu hranu. Scenáre S1 až S6 pochádzajú zo simulácie (modelové hodnoty), S0 je aktuálny stav linky z auditu.</p>
    <div class="row" style="justify-content:space-between">
      <div class="row"><button class="btn ${ed ? 'pri' : ''}" data-act="scedit">${ed ? 'Hotovo' : 'Upraviť hodnoty scenárov'}</button><button class="btn" data-act="scadd">+ Pridať scenár</button></div>
      <span class="small muted">Kliknutím na riadok zobrazíte trojuholník scenára oproti S0.</span>
    </div>
    ${l.scen.length ? `<div class="card" style="padding:0"><div class="tbl-wrap" style="border:0"><table><thead>${head}</thead><tbody>${s0}${rows}</tbody></table></div></div>${adRows}
    <p class="small muted">ΔTSI podľa (6.11), ΔY podľa (6.17), η = ΔTSI na 100 tis. € podľa (6.33), A podľa (6.21). Y v ks/človekohodina.${l.id === 'X' ? ' Pre linku X práca neuvádza produktivitu scenárov S5 a S6 ani náklady scenárov.' : ''}</p>
    <div class="grid g2">
      <div class="card"><div class="card-h"><h2>Prírastok TSI</h2><span class="small muted">sivé izolované · modré integrované</span></div><div data-r="scbar"></div></div>
      <div class="card"><div class="card-h"><h2>S0 a vybraný scenár</h2><span class="small muted" data-r="scname"></span></div><div data-r="sccmp"></div></div>
    </div>
    <div class="grid g2">
      <div class="card" data-r="kappa"></div>
      <div class="card" data-r="pp"></div>
    </div>
    <div class="card" data-r="eta"></div>
    <details><summary>Opatrenia scenárov</summary><div><div class="tbl-wrap"><table><thead><tr><th>Scenár</th><th>Opatrenia</th></tr></thead><tbody>${l.scen.map(sc => `<tr><td><b>${sc.id}</b> ${esc(sc.name)}</td><td class="small">${esc(sc.meas || '—')}</td></tr>`).join('')}</tbody></table></div></div></details>`
      : '<div class="card"><p>Táto linka zatiaľ nemá scenáre. Pridajte scenár; začne ako kópia stavu S0 a jeho hodnoty upravíte v režime úprav.</p></div>'}`;
  },
  R: {
    sct: i => { const r = scenSummary(line(), C).rows[i]; return `<b>${fmt(r.s.TSI, 3)}</b>`; },
    scd: i => { const r = scenSummary(line(), C).rows[i]; return `<span style="color:var(--${r.dT >= 0 ? 'good' : 'bad'})">${sgn(r.dT, 3)}</span>`; },
    scb: i => fmt(scenSummary(line(), C).rows[i].s.B),
    scy: i => sgn(scenSummary(line(), C).rows[i].dY, 1),
    sce: i => fmt(scenSummary(line(), C).rows[i].eta, 3),
    sca: i => fmt(scenSummary(line(), C).rows[i].s.A.A),
    scda: i => sgn(scenSummary(line(), C).rows[i].dA),
    scbar() {
      const sm = scenSummary(line(), C);
      const items = sm.rows.map(r => ({ lab: r.sc.id, v: r.dT, d: 3, bold: r === sm.target, col: r.sc.kind === 'iso' ? 'var(--iso)' : r === sm.target ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 45%, var(--surface))' }));
      const isoSum = ['T', 'S', 'P'].reduce((a, k) => a + (sm.iso[k] ? sm.iso[k].dT : 0), 0);
      return vbars(items, { d: 3, dt: 2 }) + `<p class="small">Súčet prírastkov izolovaných scenárov: <b>${sgn(isoSum, 3)}</b>${sm.target ? `; scenár ${sm.target.sc.id} na najslabšiu hranu: <b>${sgn(sm.target.dT, 3)}</b> (${fmt(sm.target.dT / isoSum, 1)}-násobok).` : '.'}</p>`;
    },
    scname: () => { const sc = line().scen.find(s => s.id === ui.scSel); return sc ? sc.id + ' · ' + esc(sc.name) : ''; },
    sccmp() {
      const sc = line().scen.find(s => s.id === ui.scSel); if (!sc) return '<p class="muted">Vyberte scenár v tabuľke.</p>';
      const s = scState(sc, line());
      return `${radar(C.I, sc.I, { legend: ['S0', sc.id] })}<div class="stack">${edgeBars(C.e, null, s.e)}<p class="small muted">Plný pás S0, tenký pás ${sc.id}. TSI ${fmt(C.TSI, 3)} → <b>${fmt(s.TSI, 3)}</b> (${sgn(rT(s.TSI) - rT(C.TSI), 3)}), B ${fmt(C.B)} → ${fmt(s.B)}.</p></div>`;
    },
    kappa() {
      const l = line(), sm = scenSummary(l, C);
      const cands = sm.ints.filter(r => fin(r.sc.Y));
      if (!ui.kappaScen || !cands.find(r => r.sc.id === ui.kappaScen)) ui.kappaScen = (cands.find(r => r === sm.target) || cands[0] || {}).sc?.id || null;
      const ir = cands.find(r => r.sc.id === ui.kappaScen), kp = kappaOf(sm, ir);
      const sel = `<select class="inp" data-in="U:kappaScen" data-t="s" aria-label="Integrovaný scenár">${cands.map(r => `<option value="${r.sc.id}" ${r.sc.id === ui.kappaScen ? 'selected' : ''}>${r.sc.id} · ${esc(r.sc.name)}</option>`).join('')}</select>`;
      if (!kp || kp.k == null) return `<div class="card-h"><h2>Koeficient synergie κ</h2></div><p class="small muted">Na výpočet treba produktivitu Y troch izolovaných scenárov (T, S, P) a aspoň jedného integrovaného scenára.</p>${cands.length ? sel : ''}`;
      const k = kp.k, cls = k > 1 ? 'good' : k < 1 ? 'bad' : 'warn';
      return `<div class="card-h"><h2>Koeficient synergie κ</h2>${sel}</div>
        <div class="row" style="align-items:baseline"><span style="font-family:var(--font-display);font-size:34px;font-weight:700;color:var(--${cls})">κ = ${fmt(k)}</span><span class="pill ${cls}">${k > 1 ? 'synergia' : k < 1 ? 'antagonizmus' : 'aditívny efekt'}</span></div>
        <div class="formula">κ = ΔY(${ir.sc.id}) / (ΔY(${kp.parts.map(p => p.sc.id).join(') + ΔY(')})) = ${fmt(kp.num, 1)} / (${kp.parts.map(p => fmt(p.dY, 1)).join(' + ')}) = ${fmt(k)}</div>
        ${kappaChart(kp, ir.sc.id)}
        <p class="small muted">${k > 1 ? `Integrovaný scenár priniesol o ${fmt((k - 1) * 100, 0)} % vyšší prírastok produktivity než súčet izolovaných opatrení.` : k < 1 ? 'Opatrenia sa navzájom tlmia (dissynergia).' : 'Prírastky sa len sčítavajú.'} Interval spoľahlivosti κ sa určí z nameraných zmien v časti Vyhodnotenie.</p>`;
    },
    pp() {
      const l = line(), sm = scenSummary(l, C), cands = sm.ints.filter(r => fin(r.sc.Y)), ir = cands.find(r => r.sc.id === ui.kappaScen), kp = kappaOf(sm, ir);
      let pp2;
      if (!C.complete) pp2 = '<span class="pill neu">doplňte údaje auditu</span>';
      else if (!sm.ints.length) pp2 = '<span class="pill neu">bez integrovaných scenárov</span>';
      else if (!sm.target) pp2 = `<span class="pill warn">žiadny integrovaný scenár nie je zameraný na hranu ${EDGES[C.weak].lab}</span>`;
      else if (sm.best === sm.target) { const sec = sm.ints.filter(r => r !== sm.target).sort((a, b) => b.dT - a.dT)[0]; pp2 = `<span class="pill good">predbežne podporený</span><p class="small">Scenár ${sm.target.sc.id} na najslabšiu hranu ${EDGES[C.weak].lab} má najvyšší ΔTSI ${sgn(sm.target.dT, 3)}${sec ? `, o ${fmt((sm.target.dT / sec.dT - 1) * 100, 0)} % viac než ${sec.sc.id} (${sgn(sec.dT, 3)})` : ''}.</p>`; }
      else pp2 = `<span class="pill bad">nepodporený</span><p class="small">Scenár ${sm.best.sc.id} (hrana ${elab(sm.best.sc.foc)}) prekonal scenár na najslabšiu hranu: ${sgn(sm.best.dT, 3)} oproti ${sgn(sm.target.dT, 3)}. Pravidlo priority by bolo treba rozšíriť o vplyv hnacej dimenzie.</p>`;
      const pp1 = kp && kp.k != null ? (kp.k > 1 ? `<span class="pill good">predbežne podporený</span><p class="small">κ = ${fmt(kp.k)} > 1 (bodový odhad). Potvrdenie vyžaduje dolnú hranicu IS₉₅(κ) > 1 z nameraných zmien.</p>` : `<span class="pill bad">nepodporený</span><p class="small">κ = ${fmt(kp.k)} ≤ 1.</p>`) : '<span class="pill neu">chýbajú údaje Y</span>';
      return `<div class="card-h"><h2>Predpoklady modelu</h2><a class="small" href="#vyhodnotenie">Štatistické overenie →</a></div>
        <div class="stack"><div class="card flat"><h3>PP1 · Integrovaný rozvoj prinesie viac než súčet izolovaných opatrení</h3>${pp1}</div>
        <div class="card flat"><h3>PP2 · Opatrenie na najslabšiu hranu prinesie najvyšší prírastok synergie</h3>${pp2}</div></div>`;
    },
    eta() {
      const sm = scenSummary(line(), C), withC = sm.rows.filter(r => fin(r.eta));
      if (!withC.length) return `<div class="card-h"><h2>Efektívnosť investície η</h2><span class="mono muted">η = ΔTSI / N · (6.33)</span></div><p class="small muted">Náklady scenárov nie sú pre túto linku zadané. Doplňte ich v režime úprav (stĺpec N v tis. €) a model porovná prírastok synergie na jednotku nákladov.</p>`;
      const best = withC.slice().sort((a, b) => b.eta - a.eta)[0];
      return `<div class="card-h"><h2>Efektívnosť investície η</h2><span class="mono muted">η = ΔTSI / N · 100 tis. € · (6.33)</span></div>
        <div class="grid g2" style="align-items:center">${vbars(withC.map(r => ({ lab: r.sc.id, v: r.eta, bold: r === best, col: r === best ? 'var(--accent)' : r.sc.kind === 'iso' ? 'var(--iso)' : 'color-mix(in srgb, var(--accent) 45%, var(--surface))' })), { d: 3, dt: 3, h: 200 })}
        <div class="stack"><p class="small">Najvyšší prírastok synergie na jednotku nákladov má <b>${best.sc.id}</b> (η = ${fmt(best.eta, 3)}).</p><p class="small muted">Lacné izolované scenáre môžu mať vysokú efektívnosť, ale malý absolútny prírastok. Rozhodovať treba podľa η aj ΔTSI.</p></div></div>`;
    }
  }
};
