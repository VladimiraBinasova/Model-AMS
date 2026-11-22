/* ===== Pohľady: Model, Audit ===== */
const VIEWS = {};
let C; /* stav aktívnej linky počas refresh() */
ui.imb = { T: 0.8, S: 0.6, P: 0.4 };

/* ---------- MODEL ---------- */
VIEWS.model = {
  t: 'Model synergie', sub: 'Koncepcia, dimenzie a väzby · kap. 6.3 až 6.6',
  html() {
    const pr = [
      ['Princíp optimalizácie', 'Dimenzie sa rozvíjajú súčasne a vo vzájomnej nadväznosti, nie postupne a oddelene (Cherns, 1976).'],
      ['Princíp najslabšej väzby', 'Celková synergia je limitovaná hranou s najnižším príspevkom, preto sa opatrenia smerujú na ňu.'],
      ['Princíp cyklickej adaptácie', 'Stav trojuholníka sa priebežne meria a opatrenia sa opakujú v adaptačnom cykle (Kephart a Chess, 2003).']
    ];
    return `
    <p class="intro">Model hodnotí, ako dobre spolu pôsobia tri dimenzie montážnej linky: technologická (T), socio-technická (S) a procesno-organizačná (P). Dimenzie tvoria vrcholy trojuholníka, ich väzby hrany a stred vyjadruje triangulačný index synergie TSI. Synergia vzniká na hranách, preto sa zlepšenie jednej dimenzie prejaví len vtedy, ak sa zlepší aj jej väzba na susedné dimenzie.</p>
    <div class="grid g-wide">
      <div class="card"><div class="card-h"><h2>Triangulačný model synergie</h2><span class="small muted">Hodnoty: ${esc(line().name)} · kliknite na vrchol, hranu alebo stred</span></div><div data-r="mdiag"></div></div>
      <div class="card" data-r="mdet"></div>
    </div>
    <div class="grid g3">${pr.map((p, i) => `<div class="card flat"><span class="mono muted">${i + 1}</span><h3>${p[0]}</h3><p class="small">${p[1]}</p></div>`).join('')}</div>
    <div class="card">
      <div class="card-h"><h2>Penalizácia nevyváženosti</h2><span class="mono muted">TSI′ = (I(t)·I(s) + I(s)·I(p) + I(p)·I(t)) / 3 · (6.6)</span></div>
      <p class="small muted" style="max-width:80ch">Pri rovnakom priemere indexov dosiahne plošný index synergie maximum vtedy, keď sú indexy rovnaké (vzťah 6.9). Slabosť jednej dimenzie teda nemožno vyvážiť silou inej. Vyskúšajte profily z tabuľky 6.12 alebo vlastné hodnoty.</p>
      <div class="grid g2" style="align-items:center">
        <div class="stack">
          ${DIM_KEYS.map(k => `<div class="sl"><label for="imb-${k}">I(${k.toLowerCase()}) · ${k}</label><input id="imb-${k}" type="range" min="0" max="1" step="0.01" value="${ui.imb[k]}" data-in="U:imb.${k}"><output>${fmt(ui.imb[k])}</output></div>`).join('')}
          <div class="row small"><span class="muted">Profily z tab. 6.12:</span>${['0.6,0.6,0.6', '0.8,0.6,0.4', '0.9,0.6,0.3', '0.9,0.9,0'].map(p => `<button class="chip" data-act="imbp" data-v="${p}">(${p.split(',').map(x => fmt(+x)).join('; ')})</button>`).join('')}</div>
          <div class="grid g3" data-r="imbt"></div>
          <p class="small muted">Rovnaký princíp platí v hrane: dvojice (0,5; 0,5) a (0,9; 0,1) majú rovnaký priemer 0,50, súčin ich však hodnotí 0,25 a 0,09 (obr. 6.9).</p>
        </div>
        <div data-r="imb"></div>
      </div>
    </div>
    <details><summary>Čím sa model líši od bežného hodnotenia linky (tab. 6.5)</summary><div><div class="tbl-wrap"><table><thead><tr><th>Oblasť</th><th>Bežné hodnotenie linky</th><th>Navrhovaný model</th></tr></thead><tbody>${SPECIFICS.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div></div></details>
    <details><summary>Pojmy modelu a ich analógie v priemyselnom inžinierstve (tab. 6.2)</summary><div><div class="tbl-wrap"><table><thead><tr><th>Pojem modelu</th><th>Čo vyjadruje na linke</th><th>Analógia v priemyselnom inžinierstve</th></tr></thead><tbody>${GLOSSARY.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div></div></details>`;
  },
  R: {
    mdiag() {
      const sel = ui.modelSel, P = { T: [330, 60], S: [125, 392], P: [535, 392] }, bw = 240, bh = 96;
      const node = k => { const [x, y] = P[k]; return `<g class="node ${sel === k ? 'on' : ''}" data-act="msel" data-k="${k}" tabindex="0" role="button" aria-label="${DIMS[k].name} dimenzia">
        <rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="10"/>
        <text x="${x}" y="${y - 16}" text-anchor="middle" font-size="18" font-weight="700">${k} · ${DIMS[k].name}</text>
        <text x="${x}" y="${y + 6}" text-anchor="middle" font-size="13.5" class="mt">${DIMS[k].tags.length > 32 ? DIMS[k].tags.slice(0, DIMS[k].tags.lastIndexOf(',', 32)) : DIMS[k].tags}</text>
        <text x="${x}" y="${y + 32}" text-anchor="middle" font-size="17" font-weight="700" class="acc">I(${k.toLowerCase()}) = ${fmt(C.I[k])}</text></g>`; };
      const E = { TS: [[258, 108], [190, 344], 205, 205, 'end'], PT: [[402, 108], [470, 344], 455, 205, 'start'], SP: [[245, 392], [415, 392], 330, 452, 'middle'] };
      const edge = k => { const [[x1, y1], [x2, y2], lx, ly, an] = E[k]; const isW = C.weak === k;
        return `<g class="edge ${sel === k ? 'on' : ''}" data-act="msel" data-k="${k}" role="button" tabindex="0" aria-label="Hrana ${EDGES[k].lab}">
        <line class="v" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-start="url(#ah)" marker-end="url(#ah)" ${isW ? 'style="stroke:var(--accent);stroke-width:3.4"' : ''}/>
        <line class="hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
        <text x="${lx}" y="${ly}" text-anchor="${an}" font-size="17" font-weight="700" ${isW ? 'class="acc"' : ''}>Hrana ${EDGES[k].lab}${isW ? ' · najslabšia' : ''}</text>
        <text x="${lx}" y="${ly + 20}" text-anchor="${an}" font-size="14" class="mt">${EDGES[k].name}</text>
        <text x="${lx}" y="${ly + 40}" text-anchor="${an}" font-size="15">q = ${fmt(C.q[k])} · e = ${fmt(C.e[k], 3)}</text></g>`; };
      const cOn = sel === 'C';
      return `<svg class="svgbox diag" viewBox="0 0 660 500" role="group" aria-label="Triangulačný model">
        <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker></defs>
        ${EDGE_KEYS.map(edge).join('')}${DIM_KEYS.map(node).join('')}
        <g class="node ${cOn ? 'on' : ''}" data-act="msel" data-k="C" role="button" tabindex="0" aria-label="Triangulačný index synergie">
          <rect x="235" y="212" width="190" height="84" rx="10" style="stroke:var(--accent)"/>
          <text x="330" y="236" text-anchor="middle" font-size="13" class="mt">Adaptívny montážny proces</text>
          <text x="330" y="265" text-anchor="middle" font-size="23" font-weight="700">TSI = ${fmt(C.TSI, 3)}</text>
          <text x="330" y="285" text-anchor="middle" font-size="13" class="mt">${C.complete ? C.band.name.toLowerCase() + ' synergia' : 'neúplné údaje'}</text></g>
      </svg>`;
    },
    mdet() {
      const k = ui.modelSel, l = line();
      if (DIMS[k]) {
        const inds = INDICATORS.filter(i => i.d === k);
        return `<div class="card-h"><h2><span class="dimtag">${k}</span> ${DIMS[k].name} synergia</h2><span class="pill acc">I(${k.toLowerCase()}) = ${fmt(C.I[k])}</span></div>
        <p class="small">${DIMS[k].desc}</p>
        <div class="tbl-wrap"><table><thead><tr><th>Kód</th><th>Indikátor</th><th>Spôsob zisťovania</th><th>Smer</th>${C.di ? '<th class="r">x̃</th>' : ''}</tr></thead><tbody>
        ${inds.map(i => `<tr><td><b>${i.c}</b></td><td>${i.n} <span class="muted">[${i.u}]</span></td><td class="small">${i.m}</td><td class="small">${i.dir > 0 ? 'vyšší = lepší' : 'nižší = lepší'}</td>${C.di ? `<td class="r">${fmt(C.di.norm[i.c])}</td>` : ''}</tr>`).join('')}</tbody></table></div>
        <p class="small muted">${C.di ? 'Normalizované hodnoty x̃ pre ' + esc(l.name) + '.' : 'Pre ' + esc(l.name) + ' práca uvádza len indexy dimenzií, nie hodnoty jednotlivých indikátorov.'} Index dimenzie: I(k) = Σ w(kj) · x̃(kj), vzťah (6.3).</p>`;
      }
      if (EDGES[k]) {
        const E = EDGES[k], inds = EDGE_IND.filter(i => i.e === k);
        return `<div class="card-h"><h2>Hrana ${E.lab}: ${E.name}</h2><span class="pill ${C.weak === k ? 'acc' : 'neu'}">${C.weak === k ? 'najslabšia hrana' : 'e = ' + fmt(C.e[k], 3)}</span></div>
        <p class="small">${E.desc} Typické nástroje: ${E.tools}.</p>
        <div class="grid g2">
          <div class="note"><b>${E.a} → ${E.b}</b><br>${MATRIX_TXT[E.a][E.b]}</div>
          <div class="note"><b>${E.b} → ${E.a}</b><br>${MATRIX_TXT[E.b][E.a]}</div>
        </div>
        <div class="tbl-wrap"><table><thead><tr><th>Kód</th><th>Indikátor hrany</th>${C.eq ? '<th class="r">ỹ</th>' : ''}</tr></thead><tbody>${inds.map(i => `<tr><td><b>${i.c}</b></td><td>${i.n} <span class="muted">[${i.u}]</span></td>${C.eq ? `<td class="r">${fmt(C.eq.norm[i.c])}</td>` : ''}</tr>`).join('')}</tbody></table></div>
        <div class="formula">e(${E.lab}) = q · I(${E.a.toLowerCase()}) · I(${E.b.toLowerCase()}) = ${fmt(C.q[k])} · ${fmt(C.I[E.a])} · ${fmt(C.I[E.b])} = ${fmt(C.e[k], 3)}</div>`;
      }
      return `<div class="card-h"><h2>Triangulačný index synergie</h2><span class="pill ${C.band.cls}">${C.band.name}</span></div>
        <p class="small">TSI jedným číslom v intervale 0 až 1 vyjadruje, do akej miery tri dimenzie pôsobia ako integrovaný celok. Odvodzuje sa z geometrie trojuholníka: osi dimenzií zvierajú 120°, plocha čiastkového trojuholníka je √3/4 · I(i) · I(j) a po normalizácii plochou ideálneho trojuholníka a vynásobení kvalitou väzby vznikne príspevok hrany.</p>
        <div class="formula">TSI = (e(TS) + e(SP) + e(PT)) / 3 = (${fmt(C.e.TS, 3)} + ${fmt(C.e.SP, 3)} + ${fmt(C.e.PT, 3)}) / 3 = ${fmt(C.TSI, 3)}</div>
        <ul class="small" style="margin:0;padding-left:18px;display:grid;gap:4px">
          <li><b>Ohraničenosť.</b> TSI = 1 len pri všetkých indexoch aj väzbách rovných 1.</li>
          <li><b>Penalizácia nevyváženosti.</b> Pri rovnakom súčte indexov je TSI najvyšší pri rovnakých indexoch.</li>
          <li><b>Citlivosť na väzby.</b> Ani dobre rozvinuté dimenzie nevytvoria vysoký TSI pri zle zvládnutých rozhraniach.</li>
          <li><b>Rozložiteľnosť.</b> Z TSI priamo vidno, ktorá hrana systém limituje.</li>
          <li><b>Porovnateľnosť.</b> Pri rovnakých indikátoroch, váhach a referenčných hodnotách je TSI porovnateľný v čase aj medzi linkami.</li>
        </ul>
        <p class="small muted">Analógia: príspevok hrany sa počíta ako OEE (súčin činiteľov); najslabšia hrana zohráva úlohu úzkeho miesta linky.</p>`;
    },
    imb() { const I = ui.imb, m = (I.T + I.S + I.P) / 3; return radar(I, { T: m, S: m, P: m }, { legend: ['zvolený profil', 'vyvážený profil s rovnakým priemerom'] }); },
    imbt() {
      const I = ui.imb, m = (I.T + I.S + I.P) / 3, tp = (I.T * I.S + I.S * I.P + I.P * I.T) / 3, mx = Math.max(I.T, I.S, I.P), B = mx ? Math.min(I.T, I.S, I.P) / mx : 0;
      return `<div class="tile"><span class="lab">Aritmetický priemer</span><span class="val" style="font-size:24px">${fmt(m)}</span></div>
        <div class="tile"><span class="lab">TSI′ (6.6)</span><span class="val" style="font-size:24px">${fmt(tp, 3)}</span><span class="sub">vyvážený: ${fmt(m * m, 3)}</span></div>
        <div class="tile"><span class="lab">Vyváženosť B</span><span class="val" style="font-size:24px">${fmt(B)}</span></div>`;
    }
  }
};

/* ---------- AUDIT ---------- */
function tilesHTML(s, compact) {
  const dr = s.dem.ok ? s.dem.driver : null;
  const miss = s.missing + ' ' + (s.missing === 1 ? 'hodnota' : s.missing < 5 ? 'hodnoty' : 'hodnôt');
  const weakTile = s.weak
    ? `<span class="val acc">${EDGES[s.weak].lab} <small>e = ${fmt(s.e[s.weak], 3)}</small></span>${compact ? '' : `<span class="sub">${s.close ? `<span class="pill warn">blízko ${EDGES[s.second].lab} (rozdiel ${pct(s.gap, 1)})</span>` : EDGES[s.weak].name}</span>`}`
    : `<span class="val">—</span>${compact ? '' : '<span class="sub">určí sa z úplných údajov</span>'}`;
  return `
    <div class="tile"><span class="lab">Triangulačný index TSI (6.8)</span><span class="val">${fmt(s.TSI, 3)} <span class="pill ${s.band.cls}">${s.band.name.toLowerCase()}</span></span>${compact ? '' : `<span class="sub">${s.complete ? 'TSI′ bez väzieb = ' + fmt(s.TSIp, 3) : 'chýba ' + miss}</span>`}</div>
    <div class="tile"><span class="lab">Vyváženosť dimenzií B (6.10)</span><span class="val">${fmt(s.B)} <small>max. 1,00</small></span>${compact ? '' : `<span class="sub">min / max indexov dimenzií</span>`}</div>
    <div class="tile"><span class="lab">Najslabšia hrana (6.29)</span>${weakTile}</div>
    <div class="tile"><span class="lab">Hnacia dimenzia (DEMATEL)</span><span class="val">${dr || '—'} <small>${dr ? 'r = ' + sgn(s.dem.role[dr].r) : ''}</small></span>${compact ? '' : `<span class="sub">${dr ? 'závislá: ' + DIM_KEYS.filter(k => s.dem.role[k].r < 0).join(', ') : 'doplňte maticu'}</span>`}</div>`;
}

VIEWS.audit = {
  t: 'Audit linky', sub: 'Kroky 1 až 5 metodiky · výpočet indexov, TSI a diagnostika',
  html() {
    const l = line(), ind = l.mode === 'ind' && l.ind;
    let inputs;
    if (ind) {
      const row = i => { const v = l.ind[i.c]; return `<tr data-ind="${i.c}" class="click ${ui.selInd === i.c ? 'sel' : ''}" data-act="selind" data-k="${i.c}">
        <td><b>${i.c}</b> ${i.n}<div class="small muted">${i.u} · ${i.dir > 0 ? 'vyšší = lepší (6.1)' : 'nižší = lepší (6.2)'}</div></td>
        ${['x', 'x0', 'xs', 'w'].map(f => `<td class="r"><input class="inp sm" id="in-${i.c}-${f}" inputmode="decimal" value="${iv(v[f])}" data-in="L:ind.${i.c}.${f}" aria-label="${i.c} ${f}"></td>`).join('')}
        <td data-r="nv:${i.c}"></td></tr>`; };
      const erow = i => { const v = l.edge[i.c]; return `<tr data-ind="${i.c}" class="click ${ui.selInd === i.c ? 'sel' : ''}" data-act="selind" data-k="${i.c}">
        <td><b>${i.c}</b> ${i.n}<div class="small muted">${i.u} · vyšší = lepší</div></td>
        ${['x', 'x0', 'xs'].map(f => `<td class="r"><input class="inp sm" id="in-${i.c}-${f}" inputmode="decimal" value="${iv(v[f])}" data-in="L:edge.${i.c}.${f}" aria-label="${i.c} ${f}"></td>`).join('')}<td></td>
        <td data-r="nv:${i.c}"></td></tr>`; };
      inputs = `<div class="card">
        <div class="card-h"><h2>Indikátory dimenzií a hrán</h2><span class="small muted">x nameraná · x₀ najhoršia prijateľná · x* cieľová · w váha AHP</span></div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(260px,320px);align-items:start" id="indgrid">
          <div class="stack">
          <div class="tbl-wrap"><table><thead><tr><th>Indikátor dimenzie (tab. 6.7)</th><th class="r">x</th><th class="r">x₀</th><th class="r">x*</th><th class="r">w</th><th>x̃</th></tr></thead><tbody>
          ${DIM_KEYS.map(d => `<tr class="grp"><td colspan="5">${d} · ${DIMS[d].name}</td><td data-r="gi:${d}"></td></tr>` + INDICATORS.filter(i => i.d === d).map(row).join('')).join('')}
          </tbody></table></div>
          <div class="tbl-wrap"><table><thead><tr><th>Indikátor hrany (tab. 6.10)</th><th class="r">x</th><th class="r">x₀</th><th class="r">x*</th><th></th><th>ỹ</th></tr></thead><tbody>
          ${EDGE_KEYS.map(e => `<tr class="grp"><td colspan="5">${EDGES[e].lab} · ${EDGES[e].name}</td><td data-r="gq:${e}"></td></tr>` + EDGE_IND.filter(i => i.e === e).map(erow).join('')).join('')}
          </tbody></table></div>
          ${l.id === 'Y' ? '<p class="small muted">Hodnoty linky Y sú z tab. 6.24 a 6.25. Referenčné a cieľové hodnoty indikátorov hrán práca neuvádza; sú nastavené tak, aby normalizované hodnoty zodpovedali tab. 6.25.</p>' : ''}
          </div>
          <div class="card flat" style="position:sticky;top:86px" data-r="normdet"></div>
        </div></div>`;
    } else {
      const sl = (k, lab) => `<div class="sl"><label for="d-${k}">${lab}</label><input id="d-${k}" type="range" min="0" max="1" step="0.01" value="${fin(l.direct[k]) ? l.direct[k] : 0.5}" data-in="L:direct.${k}"><output>${fmt(l.direct[k])}</output></div>`;
      inputs = `<div class="card"><div class="card-h"><h2>Priame zadanie indexov a kvality väzieb</h2><span class="small muted">${l.id === 'X' ? 'Linka X: hodnoty z tab. 6.19 (stav S0)' : 'Hodnoty v intervale 0 až 1'}</span></div>
        <div class="grid g2"><div class="stack"><h3>Indexy dimenzií I(k)</h3>${DIM_KEYS.map(k => sl(k, `I(${k.toLowerCase()}) · ${k}`)).join('')}</div>
        <div class="stack"><h3>Kvalita väzieb q(ij)</h3>${EDGE_KEYS.map(k => sl(k, `q(${k.toLowerCase()}) · ${EDGES[k].lab}`)).join('')}</div></div></div>`;
    }
    const adaptIn = ind ? '' : `<div class="row small">${['T1', 'T5', 'P5', 'S1'].map(k => `<label class="row" style="gap:6px" for="ad-${k}"><b>${k}</b><input class="inp sm" id="ad-${k}" inputmode="decimal" value="${iv(l.adapt[k])}" data-in="L:adapt.${k}"><span class="muted">${INDICATORS.find(i => i.c === k).u}</span></label>`).join('')}</div>`;
    return `
    <div class="row" style="justify-content:space-between">
      <div class="row"><span class="small muted">Vstup:</span><div class="seg"><button data-act="mode" data-v="ind" class="${ind ? 'on' : ''}" ${l.ind ? '' : 'disabled title="Pre linku X práca neuvádza hodnoty indikátorov"'}>15 indikátorov + 6 hrán</button><button data-act="mode" data-v="direct" class="${ind ? '' : 'on'}">Priame zadanie indexov</button></div></div>
      <div class="row lid"><div><b>${esc(l.name)}</b>${l.sub ? ` <span class="muted">${esc(l.sub)}</span>` : ''}<div class="small muted">${esc(auditMeta(l)) || 'dátum auditu a audítor nie sú zadané'}</div></div><button class="btn pri" data-act="wzopen">Vstupný formulár</button><button class="btn" data-act="editline">Upraviť údaje linky</button><button class="btn" data-act="dupline">Kopírovať</button>${S.lines.length > 1 ? '<button class="btn ghost danger" data-act="delline">Odstrániť</button>' : ''}</div>
    </div>
    ${l.info && l.info.length ? `<p class="small muted">${l.info.slice(0, 4).map(r => esc(r[0]) + ': ' + esc(r[1])).join(' · ')}</p>` : ''}
    ${!l.ind ? '<div class="note">Pre túto linku sú zadané priamo indexy dimenzií a kvalita väzieb (pri linke X podľa tab. 6.19), nie hodnoty 15 indikátorov.</div>' : ''}
    <div data-r="miss"></div>
    <div class="grid g4" data-r="tiles"></div>
    <div class="grid g-main">
      <div class="card"><div class="card-h"><h2>Profil synergie</h2><span class="small muted">vrcholy = indexy dimenzií</span></div><div data-r="radar"></div></div>
      <div class="stack" style="gap:16px">
        <div class="card"><div class="card-h"><h2>Príspevky hrán</h2><span class="mono muted">e(ij) = q(ij) · I(i) · I(j)</span></div><div data-r="edges"></div></div>
        <div class="card"><h2>Diagnostika a odporúčanie</h2><div data-r="adv"></div></div>
      </div>
    </div>
    <div class="card"><div class="card-h"><h2>Úroveň synergie</h2><span class="small muted">interpretačná škála TSI (tab. 6.11)</span></div><div data-r="scale"></div></div>
    ${inputs}
    <div class="grid g2">
      <div class="card"><div class="card-h"><h2>Produktivita linky Y</h2><span class="mono muted">Y = Q / (N · t) · (6.19)</span></div>
        <div class="row small">
          <label class="row" style="gap:6px" for="pQ">Q<input class="inp sm" id="pQ" inputmode="decimal" value="${iv(l.prod.Q)}" data-in="L:prod.Q"><span class="muted">ks/zmenu</span></label>
          <label class="row" style="gap:6px" for="pN">N<input class="inp sm" id="pN" inputmode="decimal" value="${iv(l.prod.N)}" data-in="L:prod.N"><span class="muted">operátorov</span></label>
          <label class="row" style="gap:6px" for="pt">t<input class="inp sm" id="pt" inputmode="decimal" value="${iv(l.prod.t)}" data-in="L:prod.t"><span class="muted">h</span></label>
        </div><div data-r="prod"></div></div>
      <div class="card"><div class="card-h"><h2>Index adaptability A</h2><span class="mono muted">A = (x̃T1 + x̃T5 + x̃P5 + x̃S1) / 4 · (6.21)</span></div>${adaptIn}<div data-r="adapt"></div></div>
    </div>
    <div class="card"><div class="card-h"><h2>Porovnanie liniek</h2><span class="small muted">rovnaké indikátory, váhy a referenčné hodnoty · kap. 6.3.2</span></div><div data-r="cmp"></div></div>`;
  },
  R: {
    tiles: () => tilesHTML(C),
    radar: () => radar(C.I, null),
    edges: () => edgeBars(C.e, C.weak) + `<p class="small muted">Opatrenia sa smerujú na hranu s najmenším príspevkom, nie na dimenziu s najnižším indexom.</p>`,
    miss() {
      if (C.complete) return '';
      const l = line(), list = l.mode === 'ind' && l.ind
        ? [...INDICATORS.filter(i => C.di.norm[i.c] == null).map(i => i.c), ...EDGE_IND.filter(i => C.eq.norm[i.c] == null).map(i => i.c)]
        : [...DIM_KEYS.filter(k => !fin(C.I[k])).map(k => 'I(' + k.toLowerCase() + ')'), ...EDGE_KEYS.filter(k => !fin(C.q[k])).map(k => 'q(' + EDGES[k].lab + ')')];
      return `<div class="note warn row" style="justify-content:space-between;gap:10px 16px"><span>Údaje nie sú úplné: chýba ${list.join(', ')}. Indexy dimenzií, TSI a diagnostika sa zobrazia, keď budú zadané všetky hodnoty. Údaje môžete vyplniť aj v Exceli: šablónu stiahnete v časti <a href="#ulozene">Súbory a verzie</a>.</span><button class="btn pri" data-act="wzopen">Vyplniť vstupný formulár</button></div>`;
    },
    adv() {
      const a = advice(C);
      if (!C.complete) return `<div class="note warn">${a.txt}</div>`;
      const wd = DIM_KEYS.slice().sort((x, y) => C.I[x] - C.I[y])[0];
      return `<div class="note ${a.kind === 'warn' ? 'warn' : ''}">${a.txt}</div>
        ${C.close ? `<div class="note warn">Príspevky dvoch najslabších hrán (${EDGES[C.weak].lab} ${fmt(C.e[C.weak], 3)} a ${EDGES[C.second].lab} ${fmt(C.e[C.second], 3)}) sa líšia o menej ako 10 %. Považujte obe za kandidátov a poradie opatrení určte podľa DEMATEL a efektívnosti investície η (kap. 6.9.6).</div>` : ''}
        <p class="small muted">Najslabšia dimenzia je ${wd} (I = ${fmt(C.I[wd])}). Model nesmeruje opatrenia na samotnú dimenziu, ale na hranu ${EDGES[C.weak].lab} s najnižším príspevkom. <a href="#karta">Vytvoriť kartu synergie →</a></p>`;
    },
    scale() {
      const ms = S.lines.filter(l2 => l2.id !== line().id).map(l2 => ({ v: st(l2).TSI, lab: l2.name + ' ' + fmt(st(l2).TSI, 3), dim: true })).filter(m => fin(m.v));
      const me = fin(C.TSI) ? [{ v: C.TSI, lab: line().name + ' ' + fmt(C.TSI, 3) }] : [];
      return scaleStrip([...ms, ...me]) + `<p class="small"><b>${C.band.name}:</b> ${C.band.ch}. <span class="muted">Odporúčanie: ${C.band.rec}.</span> <span class="muted">Hranice pásiem sú navrhnuté expertne a treba ich kalibrovať.</span></p>`;
    },
    gi: d => `<span class="num">I = ${fmt(C.I[d])}</span>${C.di.missing[d] ? ` <span class="pill warn">chýba ${C.di.missing[d]}</span>` : ''}${Math.abs(C.di.wsum[d] - 1) > 0.005 ? ` <span class="pill bad" title="Súčet váh má byť 1">Σw = ${fmt(C.di.wsum[d])}</span>` : ''}`,
    gq: e => `<span class="num">q = ${fmt(C.q[e])}</span>`,
    nv: c => { const nn = C.di && (c in C.di.norm) ? C.di.norm[c] : (C.eq ? C.eq.norm[c] : null);
      return nn == null ? '<span class="muted">—</span>' : `<div class="row" style="gap:6px;flex-wrap:nowrap"><div class="nbar" style="width:54px"><i style="width:${(nn * 100).toFixed(0)}%"></i></div><span class="num">${fmt(nn)}</span></div>`; },
    normdet() {
      const l = line(), c = ui.selInd, isE = !!l.edge[c], v = isE ? l.edge[c] : l.ind[c], meta = isE ? EDGE_IND.find(i => i.c === c) : INDICATORS.find(i => i.c === c);
      if (!v || !meta) return '';
      const raw = normRaw(v.x, v.x0, v.xs), dirOk = isE || (meta.dir > 0 ? v.xs > v.x0 : v.xs < v.x0);
      return `<h3>${c} · ${meta.n}</h3>${normChart(v.x, v.x0, v.xs, meta.u)}
        <div class="formula">x̃ = (x − x₀) / (x* − x₀) = (${iv(v.x)} − ${iv(v.x0)}) / (${iv(v.xs)} − ${iv(v.x0)}) = ${fmt(raw)}${raw != null && (raw < 0 || raw > 1) ? ' → ' + fmt(clip01(raw)) : ''}</div>
        ${!dirOk ? `<div class="note warn">Pri indikátore „${meta.dir > 0 ? 'vyšší = lepší' : 'nižší = lepší'}“ má byť cieľová hodnota x* ${meta.dir > 0 ? 'väčšia' : 'menšia'} než x₀.</div>` : ''}
        <p class="small muted">Hodnoty mimo intervalu sa orežú na 0 alebo 1. Referenčné a cieľové hodnoty sa stanovia pri prvom audite a ďalej sa nemenia, aby boli indexy porovnateľné v čase. ${meta.m ? 'Zisťovanie: ' + meta.m + '.' : ''}</p>`;
    },
    prod() { const p = line().prod; return `<div class="formula">Y = ${iv(p.Q)} / (${iv(p.N)} · ${iv(p.t)}) = ${fmt(C.Y, 1)} ks/človekohodina</div><p class="small muted">Do výpočtu sa započítavajú iba operátori, nie tímlíder. Hodnota stavu S0 je základom pre ΔY a koeficient synergie κ.</p>`; },
    adapt() {
      const a = C.A; if (a.A == null) return '<p class="muted small">Doplňte hodnoty T1, T5, P5 a S1.</p>';
      const ks = ['T1', 'T5', 'P5', 'S1'], lim = ks[a.ns.indexOf(Math.min(...a.ns))];
      return `<div class="row" style="align-items:baseline"><span style="font-family:var(--font-display);font-size:30px;font-weight:700">${fmt(a.A)}</span><span class="small muted">A = (${a.ns.map(n => fmt(n)).join(' + ')}) / 4</span></div>
        <p class="small">Adaptabilitu najviac obmedzuje <b>${lim}</b> (${INDICATORS.find(i => i.c === lim).n.toLowerCase()}, x̃ = ${fmt(Math.min(...a.ns))}).</p>
        <p class="small muted">${line().mode === 'ind' && line().ind ? 'Hodnoty z indikátorov linky.' : 'Referenčné a cieľové hodnoty podľa tab. 6.31: T1 45 → 5 min, T5 40 → 4 h, P5 24 → 2 h, S1 20 → 90 %.'}</p>`;
    },
    cmp() {
      return `<div class="tbl-wrap"><table><thead><tr><th>Linka</th><th class="r">I(t)</th><th class="r">I(s)</th><th class="r">I(p)</th><th style="min-width:180px">TSI</th><th class="r">B</th><th>Najslabšia hrana</th><th>Hnacia</th><th class="r">Y [ks/čh]</th></tr></thead><tbody>
      ${S.lines.map(l2 => { const s = st(l2); return `<tr class="click ${l2.id === line().id ? 'sel' : ''}" data-act="line" data-id="${l2.id}"><td><b>${esc(l2.name)}</b> <span class="small muted">${esc(l2.sub)}</span></td>
        ${DIM_KEYS.map(k => `<td class="r">${fmt(s.I[k])}</td>`).join('')}
        <td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="nbar" style="width:90px"><i style="width:${(s.TSI * 100).toFixed(0)}%"></i></div><b>${fmt(s.TSI, 3)}</b> <span class="pill ${s.band.cls}">${s.band.name.toLowerCase()}</span></div></td>
        <td class="r">${fmt(s.B)}</td><td>${s.weak ? `<b>${EDGES[s.weak].lab}</b> <span class="muted small">${fmt(s.e[s.weak], 3)}</span>` : '<span class="muted">—</span>'}</td><td>${s.dem.ok ? s.dem.driver : '—'}</td><td class="r">${fmt(s.Y, 1)}</td></tr>`; }).join('')}
      </tbody></table></div><p class="small muted">Vzorová linka je tá s najvyšším TSI; jej osvedčené riešenia sa prenášajú cez znalostnú bázu.</p>`;
    }
  }
};
