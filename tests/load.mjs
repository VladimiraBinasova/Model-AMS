// Načíta dátový, výpočtový a súborový modul aplikácie do izolovaného kontextu (bez prehliadača).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadModel() {
  const ctx = vm.createContext({ console });
  for (const f of ['src/js/data.js', 'src/js/calc.js', 'src/js/io.js']) {
    vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
  }
  // const a function deklarované v skriptoch sú v spoločnom globálnom rozsahu kontextu
  return vm.runInContext(`({ DIMS, DIM_KEYS, INDICATORS, EDGES, EDGE_KEYS, EDGE_IND, BANDS, ADAPT_REF, AHP_EXAMPLE, SAATY,
    lineX, lineY, emptyLine, r2, rnd, normalize, dimIndices, edgeQualities, synergy, bandOf, adaptIndex, dematel, ahp, welch, bootKappa, mean,
    APP_ID, stateFromJSON, projectJSON, parseCSV, csvNum, csvDate, lineDataFromCSV })`, ctx);
}
