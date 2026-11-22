// Zostaví jednosúborovú aplikáciu docs/index.html zo zdrojov v src/.
// Použitie: node scripts/build.mjs          (zapíše docs/index.html)
//           node scripts/build.mjs --check  (overí, že docs/index.html zodpovedá zdrojom)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(root, 'src', p), 'utf8');

// Poradie je dôležité: súbory zdieľajú globálny rozsah ako bežné <script> v prehliadači.
export const JS_ORDER = [
  'js/data.js',                              // dáta kapitoly 6: indikátory, hrany, linky X a Y, tabuľky
  'js/calc.js',                              // výpočty modelu (6.1)–(6.33), DEMATEL, AHP, štatistika
  'js/io.js',                                // formáty súborov: projekt JSON, údaje linky v CSV
  'js/core.js',                              // stav aplikácie, formátovanie, SVG grafy
  'js/views-model-audit.js',                 // pohľady Model a Audit linky
  'js/views-ahp-dematel-scenare.js',         // pohľady AHP, DEMATEL, Scenáre
  'js/views-vyhodnotenie-karta-metodika.js', // pohľady Vyhodnotenie, Karta synergie, Metodika
  'js/storage.js',                           // projekt v súbore, výmena CSV, uložené verzie
  'js/forms.js',                             // úvodná obrazovka, formuláre projektu a linky, vstupný formulár meraní
  'js/app.js'                                // navigácia a udalosti; spúšťa aplikáciu
];

export function build() {
  const css = src('styles/app.css');
  const js = JS_ORDER.map((f) => `/* ---- ${f} ---- */\n` + src(f)).join('\n');
  // Odkazy pre inštaláciu ako aplikácia (GitHub Pages): manifest a ikony v docs/
  const pwa = '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icon-180.png">\n<meta name="theme-color" content="#2770d1">';
  return src('index.template.html').replace('<!--PWA-->', () => pwa).replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
}

const out = join(root, 'docs', 'index.html');
const html = build();
if (process.argv.includes('--check')) {
  const same = existsSync(out) && readFileSync(out, 'utf8') === html;
  if (!same) { console.error('docs/index.html nezodpovedá zdrojom. Spustite: npm run build'); process.exit(1); }
  console.log('docs/index.html je aktuálny.');
} else {
  writeFileSync(out, html);
  console.log(`docs/index.html zapísaný (${(html.length / 1024).toFixed(0)} KB)`);
}
