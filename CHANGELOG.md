# Zmeny

## 2.3.0

- **Vzorové údaje linky Y** podľa prepočtu modelu v práci (tab. 6.24 až 6.29): T2 = 83,33 %, S1 = 43,75 %, prvý indikátor hrany S–P = 66,7 % (8 z 12 operátorov). Východiskový stav: I(t) = 0,79, q(sp) = 0,60, TSI = 0,262, B = 0,77.
- **Scenáre linky Y**: upravené I(t), I(s) v S4 a q(sp) a podiel S1 v indexe adaptability A. Výsledky: S4 TSI 0,436 (ΔTSI +0,174, B 0,85, η 0,092); κ = 1,32 bez zmeny.
- Projekt uložený staršou verziou (v prehliadači aj v súbore): vo vzorovej linke Y sa pri otvorení zmenia len bunky, ktoré majú ešte pôvodnú vzorovú hodnotu. Kópie linky Y a hodnoty upravené používateľom ostávajú.
- Linka X sa nemení. Vzorové súbory v `examples/` a testy zodpovedajú novým hodnotám.

## 2.2.0

- **Úvodná obrazovka**: nový projekt (názov, podnik, audítor), pokračovanie v rozpracovanom projekte, otvorenie súboru, príklad z práce; voľba, či sa má zobrazovať pri spustení; otvorí ju aj logo v bočnom paneli.
- **Vstupný formulár meraní** po krokoch (T, S, P, väzby, zmena, súhrn) s popisom metódy, vzorcom, referenciami, okamžitou normalizovanou hodnotou a kontrolou rozsahu; pre linky zadané priamo kroky indexy, adaptabilita, zmena. Otvorí sa po vytvorení linky a tlačidlom Vstupný formulár v Audite linky.
- Formulár novej linky už neponúka predvyplnenie podľa liniek X a Y; po potvrdení pokračuje na vstupný formulár. Nový projekt začína formulárom projektu a prvej linky.
- Projekt má podnik a predvoleného audítora (karta synergie, výsledky CSV, Súbory a verzie).
- **Ikona aplikácie**: v bočnom paneli, na úvodnej obrazovke, ako ikona karty prehliadača; na GitHub Pages manifest a ikony na inštaláciu ako aplikácia.
- `index.html` v koreni repozitára otvorí aplikáciu aj pri GitHub Pages nastavenom na koreň (predtým sa zobrazilo README); README má odkaz **Spustiť aplikáciu** a postup nasadenia pre repozitár Model-synergie.

## 2.1.0

- **Formulár novej linky**: názov, popis, dátum auditu, audítor alebo tím, údaje zmeny Q, N, t a východiskové hodnoty: prázdna linka (indikátory alebo priame indexy) alebo predvyplnenie podľa príkladu linky X alebo Y z práce. Pri príklade sa dá prevziať aj hodnotenie expertov, scenáre a akčný plán.
- **Upraviť údaje linky** v Audite linky otvorí ten istý formulár; kontrola povinného názvu a číselných hodnôt.
- Dátum auditu a audítor sú v hlavičke auditu, na karte synergie a v súboroch CSV (šablóna, výsledky aj načítanie).
- Popisy liniek na škále TSI sa neprekrývajú ani pri viacerých linkách s blízkym TSI; aktívna linka je zvýraznená.

## 2.0.0

Aplikácia je pripravená na skutočné audity, nielen na ukážku modelu z práce.

- **Projekt v súbore**: Otvoriť, Uložiť a Uložiť ako (Ctrl + O, Ctrl + S, Ctrl + Shift + S). V Chrome a Edge sa ukladá späť do otvoreného súboru, inde ako stiahnutý súbor. Názov súboru a neuložené zmeny sú v bočnom paneli; pred zatvorením stránky s neuloženými zmenami sa prehliadač opýta.
- **Nový projekt** s prázdnou linkou a **Pridať príklady z práce** (linky X a Y).
- **Výmena údajov s Excelom**: šablóna CSV na zber údajov, načítanie CSV do novej alebo aktívnej linky (bodkočiarka aj čiarka, desatinná čiarka aj bodka), načítanie súboru výsledkov vrátane liniek zadaných priamo.
- **Neúplné údaje**: prázdna linka nemá predvyplnené merania; aplikácia ukáže chýbajúce indikátory a TSI, diagnostiku ani scenáre nepočíta, kým nie sú zadané všetky hodnoty.
- **Linky**: prázdna linka alebo kópia aktívnej linky, premenovanie a odstránenie ľubovoľnej linky (vrátane X a Y).
- **Karta synergie**: tlač alebo uloženie do PDF so svetlou tlačovou úpravou.
- Sekcia Uložené hodnoty je teraz **Súbory a verzie**; uložené stavy sa volajú verzie. Ctrl + S ukladá projekt do súboru.
- Nový modul `src/js/io.js` (formáty súborov) s testami `tests/io.test.mjs`; vzorové súbory v `examples/`.
- Súbory z verzie 1.x sa načítajú bez zmeny.

## 1.1.0

- Nová sekcia **Uložené hodnoty**: pomenované stavy s poznámkou, načítanie a odstránenie s potvrdením.
- Stiahnutie všetkých údajov ako JSON a výsledkov aktívnej linky ako CSV (bodkočiarka, desatinná čiarka, pre Excel).
- Načítanie údajov zo súboru JSON (export aj uložený stav).
- Klávesová skratka Ctrl + S (⌘ + S) uloží stav s predvoleným názvom.
- Na claude.ai sa stavy ukladajú do používateľského účtu; mimo neho (GitHub Pages, lokálny súbor) do prehliadača.
- Indikátor automatického ukladania v bočnom paneli.

## 1.0.0

- Model synergie: interaktívny trojuholník T–S–P, penalizácia nevyváženosti (tab. 6.12), pojmy a špecifiká modelu.
- Audit linky: 15 indikátorov a 6 indikátorov hrán alebo priame zadanie indexov, TSI, B, príspevky hrán, diagnostika podľa kroku 5, index adaptability A, produktivita Y, porovnanie liniek.
- Váhy AHP s kontrolou konzistencie, DEMATEL s viacerými expertmi a kontrolou robustnosti.
- Scenáre S0 až S6, koeficient synergie κ, predpoklady PP1 a PP2, efektívnosť investície η.
- Vyhodnotenie: validácia simulácie δ, Welchov t-test, bootstrapový interval spoľahlivosti κ.
- Karta synergie linky s akčným plánom, metodika v ôsmich krokoch a adaptačný cyklus MAPE-K.
- Modelové linky X a Y z kapitoly 6.9.
