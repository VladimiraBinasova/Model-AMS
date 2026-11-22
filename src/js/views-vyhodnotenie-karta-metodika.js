/* ===== Pohľady: Vyhodnotenie, Karta synergie, Metodika ===== */

/* ---------- VYHODNOTENIE ---------- */
const EV_KEYS = ['S0', 'S1', 'S2', 'S3', 'S4'];
const parseList = s => String(s || '').split(/[\s;]+/).map(pnum).filter(fin);
function genDemo(l, seed) {
  const s0 = st(l), sm = scenSummary(l, s0), rnd = mulberry32(seed);
  const isoY = k => sm.iso[k] && fin(sm.iso[k].sc.Y) ? sm.iso[k].sc.Y : null;
  const tgt = sm.target && fin(sm.target.sc.Y) ? sm.target : sm.ints.find(r => fin(r.sc.Y));
  const empty = { S0: '', S1: '', S2: '', S3: '', S4: '', demo: false, B: 1000, intId: tgt ? tgt.sc.id : 'S4' };
  if (!fin(s0.Y) || !tgt || ['T', 'S', 'P'].some(k => isoY(k) == null)) return empty;
  const sh = 0.04 * s0.Y, sim = 0.009 * s0.Y, j = a => a.map(iv).join('; ');
  return { S0: j(demoSeries(20, s0.Y, sh, rnd)), S1: j(demoSeries(30, isoY('T'), sim, rnd)), S2: j(demoSeries(30, isoY('S'), sim, rnd)), S3: j(demoSeries(30, isoY('P'), sim, rnd)), S4: j(demoSeries(20, tgt.sc.Y, sh, rnd)), demo: true, B: 1000, intId: tgt.sc.id };
}
function evData(l) { l = l || line(); if (!S.ev[l.id]) S.ev[l.id] = genDemo(l, 11); return S.ev[l.id]; }

VIEWS.vyhodnotenie = {
  t: 'Vyhodnotenie a štatistika', sub: 'Kroky 6 až 8 · validácia simulácie, Welchov t-test, interval spoľahlivosti κ',
  html() {
    const l = line(), ev = evData(l);
    const labs = { S0: ['S0 · zmeny pred zavedením', 'meranie na linke, n ≥ 20'], S1: ['S1 · izolovaná dimenzia T', 'simulačné replikácie'], S2: ['S2 · izolovaná dimenzia S', 'simulačné replikácie'], S3: ['S3 · izolovaná dimenzia P', 'simulačné replikácie'], S4: [`${ev.intId || 'S4'} · zmeny po pilotnom zavedení`, 'meranie na linke, n ≥ 20'] };
    return `
    <p class="intro">Simulačný model sa pred porovnaním scenárov validuje voči skutočnému stavu linky. Po pilotnom zavedení sa rozdiel produktivity zmien testuje Welchovým t-testom a neistota koeficientu synergie sa vyjadrí bootstrapovým intervalom spoľahlivosti.</p>
    ${ev.demo ? `<div class="note warn"><b>Ukážkové dáta.</b> Práca neobsahuje namerané produktivity jednotlivých zmien (pilotné zavedenie je odporúčaný ďalší krok). Hodnoty nižšie sú náhodne vygenerované tak, aby ich priemery zodpovedali modelovým hodnotám ${esc(l.name)} (smerodajná odchýlka 4 % pri zmenách a 0,9 % pri replikáciách). Nahraďte ich nameranými údajmi.</div>` : ''}
    <div class="grid g3">
      <div class="card"><div class="card-h"><h2>Validácia simulácie</h2><span class="mono muted">(6.30)</span></div>
        <div class="row small"><label class="row" style="gap:6px" for="vs">Y(sim)<input class="inp sm" id="vs" inputmode="decimal" value="${iv(l.valid.sim)}" data-in="L:valid.sim"></label>
        <label class="row" style="gap:6px" for="vr">Y(skut)<input class="inp sm" id="vr" inputmode="decimal" value="${iv(l.valid.real)}" data-in="L:valid.real"></label></div>
        <div data-r="val"></div></div>
      <div class="card" style="grid-column:span 2"><div class="card-h"><h2>Dáta produktivity [ks/človekohodina]</h2><div class="row"><button class="btn" data-act="evgen">Vygenerovať nové ukážkové dáta</button><button class="btn ghost" data-act="evclear">Vymazať</button></div></div>
        <p class="small muted">Hodnoty oddeľte medzerou, bodkočiarkou alebo novým riadkom; desatinná čiarka aj bodka sú povolené.</p>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${EV_KEYS.map(k => `<label class="stack" style="gap:4px" for="ev-${k}"><span class="small"><b>${labs[k][0]}</b><br><span class="muted">${labs[k][1]}</span></span><textarea class="inp" id="ev-${k}" data-in="E:${k}" data-t="s">${esc(ev[k])}</textarea><span class="small muted" data-r="evn:${k}"></span></label>`).join('')}</div>
      </div>
    </div>
    <div class="grid g2">
      <div class="card" data-r="welch"></div>
      <div class="card"><div class="card-h"><h2>Interval spoľahlivosti κ (bootstrap)</h2><label class="row small" for="evB">Výberov<select class="inp" id="evB" data-in="E:B">${[1000, 5000, 10000].map(b => `<option value="${b}" ${ev.B === b ? 'selected' : ''}>${b.toLocaleString('sk-SK')}</option>`).join('')}</select></label></div><div data-r="boot"></div></div>
    </div>`;
  },
  R: {
    val() {
      const v = line().valid, d = fin(v.sim) && fin(v.real) && v.real ? Math.abs(v.sim - v.real) / v.real * 100 : null;
      if (d == null) return '<p class="small muted">Zadajte produktivitu zo simulácie a nameranú produktivitu vo východiskovom stave.</p>';
      return `<div class="row" style="align-items:baseline"><span style="font-family:var(--font-display);font-size:30px;font-weight:700">δ = ${fmt(d, 1)} %</span><span class="pill ${d <= 5 ? 'good' : 'bad'}">${d <= 5 ? 'model je validný' : 'nad hranicou 5 %'}</span></div>
        <div class="formula">δ = |${iv(v.sim)} − ${iv(v.real)}| / ${iv(v.real)} · 100 = ${fmt(d, 1)} %</div>
        <p class="small muted">${d <= 5 ? 'Simulačný model možno použiť na porovnanie scenárov.' : 'Model treba prekalibrovať (napr. pravdepodobnosť mikroprestojov) pred porovnaním scenárov.'}</p>`;
    },
    evn: k => { const a = parseList(evData()[k]); return a.length ? `n = ${a.length} · priemer ${fmt(mean(a), 2)}` : 'bez hodnôt'; },
    welch() {
      const ev = evData(), y0 = parseList(ev.S0), y1 = parseList(ev.S4), w = welch(y0, y1);
      const hd = `<div class="card-h"><h2>Welchov t-test · pilotná implementácia</h2><span class="mono muted">(6.31)</span></div>`;
      if (!w) return hd + '<p class="small muted">Zadajte aspoň dve hodnoty pred zavedením (S0) a po ňom.</p>';
      const sig = w.p < 0.05 && w.m1 > w.m0;
      return hd + `<div class="row" style="align-items:baseline"><span style="font-family:var(--font-display);font-size:30px;font-weight:700">t = ${fmt(w.t, 2)}</span><span class="pill ${sig ? 'good' : 'warn'}">p ${w.p < 0.001 ? '< 0,001' : '= ' + fmt(w.p, 3)}</span><span class="pill ${sig ? 'good' : 'neu'}">${sig ? 'rozdiel je štatisticky významný' : 'rozdiel nie je preukázaný'}</span></div>
        <div class="tbl-wrap"><table><thead><tr><th></th><th class="r">n</th><th class="r">priemer Ȳ</th><th class="r">rozptyl s²</th></tr></thead><tbody>
        <tr><td>Pred zavedením (S0)</td><td class="r">${w.n0}</td><td class="r">${fmt(w.m0, 2)}</td><td class="r">${fmt(w.v0, 3)}</td></tr>
        <tr><td>Po zavedení (${esc(ev.intId || 'S4')})</td><td class="r">${w.n1}</td><td class="r">${fmt(w.m1, 2)}</td><td class="r">${fmt(w.v1, 3)}</td></tr></tbody></table></div>
        <div class="formula">t = (${fmt(w.m1, 2)} − ${fmt(w.m0, 2)}) / √(${fmt(w.v1, 3)}/${w.n1} + ${fmt(w.v0, 3)}/${w.n0}) = ${fmt(w.t, 2)} · df = ${fmt(w.df, 1)}</div>
        ${w.n0 < 20 || w.n1 < 20 ? '<div class="note warn">Metodika vyžaduje najmenej 20 sledovaných zmien v každom stave.</div>' : ''}
        <p class="small muted">Obojstranný test na hladine α = 0,05 bez predpokladu zhody rozptylov. Relatívna zmena výkonnosti δY = ${sgn((w.m1 - w.m0) / w.m0 * 100, 1)} % (6.20).</p>`;
    },
    boot() {
      const ev = evData(), g = {}; EV_KEYS.forEach(k => g[k] = parseList(ev[k]));
      if (EV_KEYS.some(k => g[k].length < 2)) return '<p class="small muted">Každá skupina S0 až S4 potrebuje aspoň dve hodnoty.</p>';
      const b = bootKappa(g, ev.B || 1000, 7);
      if (!b.ks.length) return '<p class="small muted">Súčet izolovaných prírastkov je nulový, κ nemožno vypočítať.</p>';
      let v, cls; if (b.lo > 1) { v = 'potvrdený'; cls = 'good'; } else if (b.hi <= 1) { v = 'vyvrátený'; cls = 'bad'; } else { v = 'nepotvrdený (interval obsahuje 1)'; cls = 'warn'; }
      return `<div class="row" style="align-items:baseline"><span style="font-family:var(--font-display);font-size:30px;font-weight:700">κ = ${fmt(b.point)}</span><span class="small">IS₉₅(κ) = ⟨${fmt(b.lo)}; ${fmt(b.hi)}⟩</span></div>
        ${histogram(b.ks, b.lo, b.hi)}
        <div class="row"><span class="small"><b>PP1</b> podľa kritéria tab. 6.33:</span><span class="pill ${cls}">${v}</span>${ev.demo ? '<span class="pill neu">na ukážkových dátach</span>' : ''}</div>
        <p class="small muted">${(ev.B || 1000).toLocaleString('sk-SK')} výberov s vrátením zo všetkých piatich skupín; κ = ΔY(S4) / (ΔY(S1) + ΔY(S2) + ΔY(S3)), interval z 2,5. a 97,5. percentilu (6.32). Potvrdený, ak je dolná hranica > 1; vyvrátený, ak horná hranica nie je > 1.</p>`;
    }
  }
};

/* ---------- KARTA SYNERGIE ---------- */
function cardTarget(l) { return l.scen.find(s => s.id === l.cardScen) || null; }
function cardText() {
  const l = line(), s = C, t = cardTarget(l), ts = t ? scState(t, l) : null, dr = s.dem.ok ? s.dem.driver : null;
  const L = [`KARTA SYNERGIE LINKY – ${l.name}${l.sub ? ' (' + l.sub + ')' : ''} · východiskový audit${auditMeta(l) ? ' · ' + auditMeta(l) : ''}`, `Produktivita Y = ${fmt(s.Y, 1)} ks/čh`, '',
    `TSI = ${fmt(s.TSI, 3)} (${s.band.name.toLowerCase()}) · B = ${fmt(s.B)}`,
    `Profil: ${DIM_KEYS.map(k => `${DIMS[k].name} ${fmt(s.I[k])}${ts ? ' → ' + fmt(t.I[k]) : ''}`).join('; ')}`,
    `Príspevky hrán: ${EDGE_KEYS.map(k => `${EDGES[k].lab} ${fmt(s.e[k], 3)}`).join('; ')}`,
    `Najslabšia hrana: ${s.weak ? EDGES[s.weak].lab + ' (e = ' + fmt(s.e[s.weak], 3) + ')' : '—'} · Hnacia dimenzia: ${dr ? dr + ' (r = ' + sgn(s.dem.role[dr].r) + ')' : '—'}`, '', 'Akčný plán na najslabšiu hranu:'];
  l.plan.forEach(p => L.push(`- ${p.m} | ${p.e} | ${p.r} | ${p.t}`));
  L.push('', `Opakovaný audit o ${iv(l.months)} mesiacov${ts ? ` · cieľ podľa simulácie ${t.id}: TSI = ${fmt(ts.TSI, 3)}, B = ${fmt(ts.B)}` : ''}`);
  return L.join('\n');
}
VIEWS.karta = {
  t: 'Karta synergie linky', sub: 'Výstup auditu na jednej strane · obr. 6.28 a 6.29',
  html() {
    const l = line();
    return `
    <div class="row noprint" style="justify-content:space-between">
      <div class="row small">
        <label class="row" style="gap:6px" for="kscen">Cieľ podľa scenára<select class="inp" id="kscen" data-in="L:cardScen" data-t="s"><option value="">bez cieľa</option>${l.scen.map(s => `<option value="${s.id}" ${s.id === l.cardScen ? 'selected' : ''}>${s.id} · ${esc(s.name)}</option>`).join('')}</select></label>
        <label class="row" style="gap:6px" for="kmon">Opakovaný audit o<input class="inp sm" id="kmon" inputmode="decimal" value="${iv(l.months)}" data-in="L:months">mesiacov</label>
      </div>
      <div class="row"><button class="btn" data-act="kadd">+ Pridať opatrenie</button><button class="btn" data-act="kcopy">Kopírovať ako text</button>${canPrint() ? '<button class="btn pri" data-act="kprint">Tlačiť alebo uložiť do PDF</button>' : ''}</div>
    </div>
    ${C.complete ? '' : '<div class="note warn noprint">Údaje linky nie sú úplné, karta preto neukazuje TSI ani najslabšiu hranu. Doplňte hodnoty v časti <a href="#audit">Audit linky</a>.</div>'}
    <div class="kcard">
      <div class="hd" data-r="khd"></div>
      <div class="grid g-main">
        <div class="card"><h3>Profil synergie</h3><div data-r="kradar"></div></div>
        <div class="stack" style="gap:14px">
          <div class="grid g2" data-r="ktiles"></div>
          <div class="card"><h3>Príspevky hrán k synergii e (6.7)</h3><div data-r="kedges"></div><p class="small muted">Akčný plán smeruje na hranu s najmenším príspevkom.</p></div>
        </div>
      </div>
      <div class="card"><div class="card-h"><h3>Akčný plán na najslabšiu hranu</h3><span class="small muted">3 až 5 opatrení · upravujte priamo v tabuľke</span></div>
        <div class="tbl-wrap"><table><thead><tr><th style="width:46%">Opatrenie</th><th>Hrana</th><th>Zodpovedný</th><th>Termín</th><th></th></tr></thead><tbody>
        ${l.plan.length ? l.plan.map((p, i) => `<tr><td><input class="inp wide" value="${esc(p.m)}" data-in="L:plan.${i}.m" data-t="s" aria-label="Opatrenie ${i + 1}" placeholder="Opatrenie"></td>
          <td><select class="inp" data-in="L:plan.${i}.e" data-t="s" aria-label="Hrana">${EDGE_KEYS.map(k => `<option ${EDGES[k].lab === p.e ? 'selected' : ''}>${EDGES[k].lab}</option>`).join('')}</select></td>
          <td><input class="inp wide" value="${esc(p.r)}" data-in="L:plan.${i}.r" data-t="s" aria-label="Zodpovedný" placeholder="Zodpovedný"></td>
          <td><input class="inp wide" style="width:110px" value="${esc(p.t)}" data-in="L:plan.${i}.t" data-t="s" aria-label="Termín" placeholder="mesiac 1–2"></td>
          <td><button class="btn ghost danger" data-act="kdel" data-v="${i}" aria-label="Odstrániť opatrenie">✕</button></td></tr>`).join('') : '<tr><td colspan="5" class="muted">Zatiaľ bez opatrení. Pridajte 3 až 5 opatrení na najslabšiu hranu.</td></tr>'}
        </tbody></table></div></div>
      <div class="row small" style="justify-content:space-between" data-r="kfoot"></div>
    </div>`;
  },
  R: {
    khd() { const l = line(); return `<div><h2 style="font-size:22px">Karta synergie linky</h2><span class="muted">${[S.project.org, l.name, l.sub, 'východiskový audit', auditMeta(l)].filter(Boolean).map(esc).join(' · ')}</span></div><span style="font-size:17px">Produktivita Y = <b>${fmt(C.Y, 1)} ks/čh</b></span>`; },
    kradar() { const t = cardTarget(line()); return radar(C.I, t ? t.I : null, { legend: ['Súčasný stav (S0)', `Cieľ po pláne (${t ? t.id : ''})`] }); },
    ktiles: () => tilesHTML(C, true),
    kedges: () => edgeBars(C.e, C.weak),
    kfoot() { const l = line(), t = cardTarget(l), ts = t ? scState(t, l) : null; return `<b>Opakovaný audit o ${iv(l.months) || '—'} mesiacov</b><span>${ts ? `cieľ podľa simulácie ${t.id}: <b>TSI = ${fmt(ts.TSI, 3)}, B = ${fmt(ts.B)}</b>` : '<span class="muted">cieľ: vyberte scenár</span>'}</span>`; }
  }
};

/* ---------- METODIKA ---------- */
function cycleSVG() {
  const cx = 230, cy = 200, R = 142, r = 47;
  const pos = i => { const a = (-90 + i * 60) * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; };
  let g = `<defs><marker id="ca" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker></defs>`;
  for (let i = 0; i < 6; i++) {
    const a1 = (-90 + i * 60 + 21) * Math.PI / 180, a2 = (-90 + (i + 1) * 60 - 21) * Math.PI / 180;
    g += `<path d="M${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)} A${R},${R} 0 0 1 ${cx + R * Math.cos(a2)},${cy + R * Math.sin(a2)}" fill="none" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#ca)"/>`;
  }
  g += `<circle cx="${cx}" cy="${cy}" r="62" fill="var(--sunken)" stroke="var(--line)"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="13" font-weight="700">Znalostná báza</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" class="mt">štandardy a riešenia</text>`;
  CYCLE.forEach((c, i) => {
    const [x, y] = pos(i);
    g += `<line x1="${cx + (x - cx) * 0.45}" y1="${cy + (y - cy) * 0.45}" x2="${cx + (x - cx) * 0.66}" y2="${cy + (y - cy) * 0.66}" stroke="var(--line)" stroke-dasharray="3 3"/>`;
    g += `<g class="ph ${ui.cycSel === c.n ? 'on' : ''}" data-act="cyc" data-v="${c.n}" role="button" tabindex="0" aria-label="Fáza ${c.n}: ${c.t}"><circle cx="${x}" cy="${y}" r="${r}"/><text x="${x}" y="${y - 6}" text-anchor="middle" font-size="16" font-weight="700">${c.n}</text><text x="${x}" y="${y + 12}" text-anchor="middle" font-size="11.5">${c.t}</text><text x="${x}" y="${y + 26}" text-anchor="middle" font-size="10" class="mt">${c.mk === 'rozšírenie modelu' ? 'nová fáza' : c.mk}</text></g>`;
  });
  return `<svg class="svgbox cyc" viewBox="0 0 460 400" role="group" aria-label="Adaptačný cyklus">${g}</svg>`;
}
VIEWS.metodika = {
  t: 'Metodika a adaptačný cyklus', sub: 'Osem krokov, MAPE-K, riadiace úrovne a audit · kap. 6.7 a 6.8',
  html() {
    const tot = AUDIT.reduce((a, b) => a + b.w, 0);
    return `
    <p class="intro">Kroky 1 až 5 tvoria diagnostickú časť a dajú sa použiť samostatne ako audit synergie linky. Kroky 6 až 8 tvoria intervenčnú časť a overujú predpoklady PP1 a PP2. Po zásahu sa meranie opakuje v adaptačnom cykle.</p>
    <div class="card"><div class="card-h"><h2>Osem krokov aplikácie modelu</h2><div class="row small"><span class="pill acc">diagnostická časť 1–5</span><span class="pill warn">intervenčná časť 6–8</span></div></div>
      <div data-r="steps"></div><div data-r="stepdet"></div></div>
    <div class="grid g-main">
      <div class="card"><div class="card-h"><h2>Adaptačný cyklus</h2><span class="small muted">podľa MAPE-K (Kephart a Chess, 2003)</span></div><div data-r="cyc"></div></div>
      <div class="card" data-r="cycdet"></div>
    </div>
    <div class="card"><div class="card-h"><h2>Riadiace úrovne modelu</h2><span class="small muted">tab. 6.13</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Úroveň</th><th>Typ adaptácie</th><th>Vlastník</th><th>Frekvencia</th><th>Rozhodnutia</th><th>Ukazovatele</th></tr></thead><tbody>
      ${LEVELS.map(v => `<tr><td><b>${v.t}</b></td><td>${v.typ}</td><td>${v.own}</td><td>${v.fr}</td><td>${v.dec}</td><td><span class="mono">${v.kpi}</span></td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>Audit synergie linky</h2><span class="small muted">vedie priemyselný inžinier ako audítor · 3 až 4 týždne + opakovanie po 3 až 6 mesiacoch</span></div>
      <div class="timeline">${AUDIT.map((a, i) => `<div style="flex:${a.w / tot * 10} 1 0"><span class="mono muted">${i + 1}</span><b>${a.t}</b>${a.dur}</div>`).join('')}</div>
      <div class="tbl-wrap"><table><thead><tr><th>Fáza</th><th>Činnosti</th><th>Účastníci</th><th>Trvanie</th><th>Výstup</th></tr></thead><tbody>
      ${AUDIT.map((a, i) => `<tr><td><b>${i + 1} ${a.t}</b></td><td class="small">${a.act}</td><td class="small">${a.who}</td><td class="small">${a.dur}</td><td class="small">${a.out === 'Karta synergie linky' ? '<a href="#karta">Karta synergie linky</a>' : a.out}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>Typické situácie v adaptívnej montáži</h2><span class="small muted">tab. 6.6</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Situácia</th><th>Čo sa meria</th><th>Čo model vypočíta</th><th>Rozhodnutie</th></tr></thead><tbody>
      ${SITUATIONS.map(s => `<tr><td><b>${s.s}</b></td><td class="small">${s.m}</td><td class="small">${s.c}</td><td class="small">${s.d}</td></tr>`).join('')}</tbody></table></div></div>`;
  },
  R: {
    steps: () => `<div class="steps">${STEPS.map(s => `<button class="step ${s.n <= 5 ? 'diag-part' : 'int-part'} ${ui.stepSel === s.n ? 'on' : ''}" data-act="step" data-v="${s.n}"><span class="k">Krok ${s.n} · ${s.ch}</span><b>${s.t}</b></button>`).join('')}</div>`,
    stepdet() {
      const s = STEPS.find(x => x.n === ui.stepSel), names = { audit: 'Audit linky', ahp: 'Váhy AHP', dematel: 'DEMATEL', scenare: 'Scenáre', vyhodnotenie: 'Vyhodnotenie' };
      return `<div class="card flat" style="margin-top:4px"><div class="card-h"><h3>Krok ${s.n}: ${s.t}</h3><a class="btn pri" href="#${s.go}">Otvoriť: ${names[s.go]}</a></div><p>${s.what}</p><div class="formula" style="white-space:normal">${s.res}</div><p class="small muted">Podkapitoly ${s.ch}.</p></div>`;
    },
    cyc: () => cycleSVG(),
    cycdet() {
      const c = CYCLE.find(x => x.n === ui.cycSel);
      return `<div class="card-h"><h2>${c.n} · ${c.t}</h2><span class="pill ${c.mk === 'rozšírenie modelu' ? 'warn' : 'acc'}">${c.mk === 'rozšírenie modelu' ? 'rozšírenie MAPE-K' : 'MAPE-K: ' + c.mk}</span></div>
        <p>${c.d}</p>
        <div class="tbl-wrap"><table><tbody><tr><td class="muted">Význam v pôvodnej schéme</td><td>${c.orig}</td></tr><tr><td class="muted">Nástroje modelu</td><td>${c.tools}</td></tr><tr><td class="muted">Fáza PDCA</td><td>${c.pdca}</td></tr></tbody></table></div>
        <p class="small muted">Kľúčová vlastnosť cyklu: opatrenia sa nesmerujú na dimenziu s najnižším indexom, ale na hranu s najnižším príspevkom k TSI. Výstup fázy učenia je východiskom monitorovania v ďalšom cykle.</p>`;
    }
  }
};
