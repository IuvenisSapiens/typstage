// pruefe-zeiger-ff.js — derselbe Zeiger, gemessen in einem echten Firefox
//
//   node .github/scripts/pruefe-zeiger-ff.js [--browser /pfad/zu/firefox]
//
// Warum eine zweite Probe statt einer Weiche in `pruefe-zeiger.js`: der Zeiger
// wurde in Chrome UND Firefox gemeldet, und `pruefe-zeiger.js` haengt an
// `decklauf/cdp.js` -- Firefox ab 129 antwortet auf `--remote-debugging-port`
// nur noch mit WebDriver BiDi, `curl /json/version` gibt 404. `pruefe-decks.js`
// haelt es seit je so, dass ein Treiber je Browser danebensteht
// (`decklauf/cdp.js` und `decklauf/bidi.js`); diese Probe tut dasselbe. Die
// Probedecks, die Leseausdruecke und das Verfahren, mit dem der Punkt im Bild
// vermessen wird, teilen sich beide aus `decklauf/zeigerdeck.js`, damit nicht
// zwei Wahrheiten nebeneinander stehen.
//
// Gemessen werden DIESELBEN Punkte wie in Chrome, und sie tragen dieselben
// Nummern -- wer die zwei Ausgaben nebeneinanderlegt, soll Zeile fuer Zeile
// vergleichen koennen. Die Liste steht im Kopf von `pruefe-zeiger.js` und wird
// hier nicht abgeschrieben; eine zweite Fassung derselben Liste faellt hinter
// die erste zurueck.
//
// Was in Firefox ANDERS ist, und zwar gemessen und nicht vermutet:
//
//   * Punkt 14 misst hier MEHR. Der Fokusverlust laesst sich ueber BiDi
//     wirklich herstellen: `browsingContext.activate` auf den Saal nimmt dem
//     Pult den Fokus, `document.hasFocus()` geht dort von `true` auf `false`.
//     In einem kopflosen Chrome geht das nicht -- gemessen sind
//     `Page.bringToFront`, `Emulation.setFocusEmulationEnabled: false` und ein
//     drittes Ziel mit `Target.activateTarget` alle drei wirkungslos --, und
//     dort schickt die Probe das `blur`-Ereignis deshalb selbst ab.
//   * Punkt 11 (die Drossel) misst hier beide Haelften wie in Chrome: vierzig
//     Bewegungen, die die SEITE selbst abschickt, ergeben genau eine Nachricht
//     mit genau einem Punkt, und bei vierzig einzeln abgewarteten Rufen ueber
//     den Treiber traegt keine Nachricht mehr als einen Punkt. Bis hierher
//     fehlte die zweite Haelfte, und der Kopf dieser Datei behauptete, sie
//     werde "gezaehlt, nur nicht bewertet" -- gezaehlt wurde sie nirgends.
//   * Die Bruchteile treffen in Firefox nicht auf 0,000 genau, sondern auf
//     0,0011: `input.performActions` nimmt nur ganze Bildpunkte. Deshalb
//     stehen hier 0,002 statt 0,001 als Schranke.
//   * Punkt 1 hat hier eine Klagestelle mehr als in Chrome: sie faellt, wenn
//     die zwei Buehnen fast gleich gross herauskommen. Der Punkt reist als
//     Bruchteil der Buehne, und mit zwei gleich grossen Buehnen misst diese
//     Probe genau das nicht, wofuer sie da ist. Gemessen sind die zwei hier
//     618,7 und 1600 px; in Chrome 622,2 und 1600.
//   * Die Buehne am Pult ist bei gleichem Fenster 3,5 px schmaler als in
//     Chrome (618,7 gegen 622,2). Das ist der Grund, warum diese Probe keine
//     Pixel vergleicht, sondern Bruchteile.
//
// Nichts davon bleibt ungemessen, weil BiDi es nicht koennte -- die Liste der
// Unterschiede steht auch in CONTRIBUTING.md.
const { starte, schlaf } = require("./decklauf/bidi.js");
const fs = require("fs"), path = require("path");

const WURZEL = path.resolve(__dirname, "..", "..");
const arg = (n, v) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : v; };

// Gesucht statt geraten, wie in `pruefe-decks.js`: auf einem GitHub-Laeufer
// liegt Firefox woanders als auf einem Mac, und ein falsch geratener Pfad
// saehe aus wie ein kaputtes Paket. Wird keiner gefunden, bricht die Probe ab,
// statt gruen zu melden -- eine Probe, die still nichts misst, ist schlimmer
// als eine, die fehlt.
function firefoxSuchen() {
  const kandidaten = [
    "/Applications/Firefox.app/Contents/MacOS/firefox",
    "/usr/bin/firefox", "/snap/bin/firefox",
    "/usr/lib/firefox/firefox", "/opt/firefox/firefox"
  ];
  const da = kandidaten.find(k => fs.existsSync(k));
  if (da) return da;
  console.log("Zeiger (Firefox): kein Firefox gefunden -- mit --browser einen"
    + " Pfad angeben. Geprüft wurde damit nichts.");
  process.exit(2);
}
const FIREFOX = arg("--browser", null) || firefoxSuchen();

const { MIT_PUNKT, OHNE_PUNKT, GESTELLT, SPIEGEL, HELL, NACHT, RINGE, PUNKT,
        FASSUNG, NOETIG, LOG, ARTEN, LEER, STRICHE, AKZENT, BUEHNE, bauen, paketpfad,
        ringMessen, farbeZahlen, nahe } = require("./decklauf/zeigerdeck.js");

const klagen = [];

// Zwei echte Fenster, wie in Chrome: das erste ist der Saal, `n` oeffnet das
// Pult. Absichtlich verschieden gross -- der Punkt steht in Bruchteilen der
// Buehne und darf sich von Pixeln nicht beirren lassen.
async function zweiFenster(datei, saalB, saalH, pultB, pultH) {
  const halle = await starte(FIREFOX);
  await halle.sicht(saalB, saalH);
  await halle.navigiere("file://" + datei);
  await schlaf(1800);
  const wache = await halle.zweites(80);
  await halle.taste("n");
  const pult = await wache.warte();
  await schlaf(2200);
  await pult.sicht(pultB, pultH);
  await schlaf(1400);
  return { halle, pult };
}

const buehne = async (w) => JSON.parse(await w.ev(BUEHNE));
const lies = async (w) => JSON.parse(await w.ev(PUNKT));
const werkzeug = (w, n) => w.ev(
  "document.querySelector('.ts-sp-wz[data-wz=\"" + n + "\"]').click()");

// Gruen ist nur, wer bis zum Urteil kommt. Endet node, weil nichts mehr zu
// tun ist -- etwa weil der Browser mitten im Lauf starb und eine Zusage nie
// eingeloest wurde --, bleibt es bei 3 statt bei 0.
process.exitCode = 3;
(async () => {
  const paket = paketpfad(WURZEL);
  let mitPunkt, ohnePunkt, gestellt, spiegelDeck, grundDecks;
  try {
    mitPunkt = bauen(MIT_PUNKT, "mit", paket);
    ohnePunkt = bauen(OHNE_PUNKT, "ohne", paket);
    gestellt = bauen(GESTELLT, "gestellt", paket);
    spiegelDeck = bauen(SPIEGEL, "spiegel", paket);
    grundDecks = { hell: bauen(HELL, "hell", paket),
                   nacht: bauen(NACHT, "nacht", paket) };
  } catch (e) {
    const wort = String((e.stderr || "")).split("\n")
      .find(z => z.startsWith("error:")) || "unbekannter Fehler";
    console.log("Zeiger (Firefox): ein Probedeck übersetzt nicht -- " + wort);
    process.exit(1);
  }

  // ═══ Das Regeldeck ════════════════════════════════════════════════════════
  {
    const { halle, pult } = await zweiFenster(mitPunkt, 1600, 900, 1120, 760);
    for (const [wo, w] of [["Das Pult", pult], ["Der Saal", halle]]) {
      const f = +(await w.ev(FASSUNG));
      if (f < NOETIG) {
        klagen.push("0. " + wo + " meldet pruef.fassung " + f + " statt "
                    + NOETIG + " -- ein Deck von gestern");
      }
    }
    // Welche Folie trägt den Rahmen, welche nicht, welche mehrere Schritte.
    // Gesucht und nicht gezählt, wie in Chrome.
    const folien = JSON.parse(await pult.ev(`(function(){
      var mit = -1, ohne = -1, viele = -1;
      for (var i = 0; i < typstage.slides.length; i++) {
        var r = typstage.slides[i].querySelectorAll('.ts-el iframe').length;
        if (r && mit < 0) mit = i;
        if (!r && ohne < 0) {
          var n = 0;
          for (var k = 0; k < typstage.steps.length; k++) {
            if (typstage.steps[k].slide === i) n++;
          }
          if (n === 1) ohne = i; else if (viele < 0) viele = i;
        }
      }
      if (viele < 0) for (var j = 0; j < typstage.slides.length; j++) {
        var m = 0;
        for (var q = 0; q < typstage.steps.length; q++) {
          if (typstage.steps[q].slide === j) m++;
        }
        if (m > 1) { viele = j; break; }
      }
      return JSON.stringify({ mit: mit, ohne: ohne, viele: viele }); })()`));
    if (folien.mit < 0 || folien.ohne < 0) {
      klagen.push("0. im Probedeck fehlt eine Text- oder eine Rahmenfolie --"
                  + " die Probe misst dann nichts");
    }
    const aufFolie = (f) => pult.ev(`(function(){
      for (var n = 0; n < 400 && n < typstage.steps.length; n++) {
        if (typstage.steps[n].slide === ${f}) { typstage.goto(n, true); return n; }
      } return -1; })()`);

    // ── 1 und 2: schweben, ankommen, Größe, Farbe ─────────────────────────
    await aufFolie(folien.ohne); await schlaf(700);
    await werkzeug(pult, "zeiger"); await schlaf(300);
    const bp = await buehne(pult);
    const px = (fx, fy) => [bp[0] + bp[2] * fx, bp[1] + bp[3] * fy];
    await pult.schweb(...px(0.30, 0.70));
    await schlaf(700);
    let p = await lies(pult), s = await lies(halle);
    if (!p.ebene || !p.an) klagen.push("1. am Pult erschien beim Schweben kein Punkt");
    if (!s.ebene || !s.an) {
      klagen.push("1. im Saal erschien beim Schweben kein Punkt -- genau das"
                  + " war die Meldung, und sie kam aus Firefox");
    } else if (Math.abs(s.x - 0.30) > 0.002 || Math.abs(s.y - 0.70) > 0.002) {
      klagen.push("1. der Saal setzte den Punkt auf " + s.x + "/" + s.y
                  + " statt 0.30/0.70");
    }
    if (p.ebene && s.ebene) {
      if (Math.abs(s.x - p.x) > 0.002 || Math.abs(s.y - p.y) > 0.002) {
        klagen.push("1. Pult " + p.x + "/" + p.y + " gegen Saal " + s.x + "/" + s.y
                    + " -- dieselbe Geste, zwei Stellen");
      }
      if (Math.abs(p.buehne - s.buehne) < 100) {
        klagen.push("1. die zwei Bühnen sind fast gleich groß (" + p.buehne
                    + "/" + s.buehne + ") -- dann misst diese Probe nicht,"
                    + " worum es geht");
      }
      for (const [wo, w] of [["Pult", p], ["Saal", s]]) {
        if (Math.abs(w.anteil - 2.2) > 0.15) {
          klagen.push("2. im " + wo + " maß der Punkt " + w.anteil + " % der"
                      + " Bühne statt 2,2 % (" + w.px + " px auf " + w.buehne
                      + " px)");
        }
      }
      // Die Zahlen mitschreiben, nicht nur bewerten: der CHANGELOG-Eintrag
      // zum Zeiger nennt sie, und wer sie nachlesen will, soll sie hier
      // ablaufen sehen statt sie glauben zu muessen.
      process.stderr.write("Firefox: Pult " + p.x + "/" + p.y + " auf "
        + p.buehne + " px (" + p.px + " px, " + p.anteil + " %) · Saal "
        + s.x + "/" + s.y + " auf " + s.buehne + " px (" + s.px + " px, "
        + s.anteil + " %) · Farbe " + s.farbe + "\n");
    }
    // Und die Vorgabefarbe wirklich prüfen. Sie wurde bis hierher nur
    // mitgeschrieben: mit der Zeile, die den Deckakzent auf `--ts-zeiger`
    // legt, herausgenommen stand hier „· Farbe " ohne Wert, und die Probe
    // meldete „in Ordnung".
    const akzent = String(await pult.ev(AKZENT) || "");
    if (!akzent) {
      klagen.push("2. das Probedeck nennt in #ts-cfg gar keinen accent --"
                  + " dann ist die Vorgabefarbe nicht zu prüfen");
    }
    for (const [wo, w] of [["Pult", p], ["Saal", s]]) {
      if (!w.ebene) continue;
      if (!String(w.farbe || "").trim()) {
        klagen.push("2. im " + wo + " hat der Punkt gar keine Farbe --"
                    + " `--ts-zeiger` ist leer, und das Stilblatt fällt auf"
                    + " seinen eigenen Rückfallwert zurück statt auf den"
                    + " Akzent des Decks");
      } else if (akzent && !nahe(farbeZahlen(w.farbe), farbeZahlen(akzent), 1)) {
        klagen.push("2. im " + wo + " trägt der Punkt " + w.farbe + " statt des"
                    + " Deckakzents " + akzent);
      }
    }

    // ── 11: die Drossel ───────────────────────────────────────────────────
    //
    // Vierzig Bewegungen in EINEM Ablauf -- ohne ein Bild dazwischen --
    // ergeben genau eine Nachricht mit genau einem Punkt. Sie müssen aus der
    // Seite selbst kommen; ein Ruf über den Treiber wird einzeln abgewartet,
    // und zwischen zwei abgewarteten Rufen liegt immer ein Bild.
    await pult.ev(`window.__gezaehlt = [];
      (function(){ var o = window.opener; if (!o) return;
        var alt = o.postMessage.bind(o);
        o.postMessage = function (m, t) {
          if (m && m.kanal === 'zeiger') window.__gezaehlt.push(m.punkte.length);
          return alt(m, t); }; })(); 1`);
    const stoss = JSON.parse(await pult.ev(`(function(){
      var b = document.getElementById('ts-stage');
      var r = b.getBoundingClientRect();
      for (var i = 1; i <= 40; i++) {
        b.dispatchEvent(new PointerEvent("pointermove", { bubbles: true,
          clientX: r.left + r.width * (0.2 + 0.6 * i / 40),
          clientY: r.top + r.height * 0.5,
          pointerId: 1, pointerType: "mouse", buttons: 0 }));
      }
      return JSON.stringify(window.__gezaehlt);
    })()`));
    await schlaf(600);
    const nachStoss = JSON.parse(await pult.ev(`JSON.stringify(window.__gezaehlt)`));
    if (stoss.length) {
      klagen.push("11. schon während des Stoßes lagen " + stoss.length
                  + " Nachricht(en) auf der Leitung -- ungedrosselt");
    }
    if (nachStoss.length !== 1 || nachStoss[0] !== 1) {
      klagen.push("11. vierzig Bewegungen in einem Ablauf ergaben "
                  + JSON.stringify(nachStoss) + " statt genau [1] --"
                  + " die Drossel hält nur den letzten Punkt");
    }
    // Und es ist der LETZTE, wie in Chrome (die Begründung steht dort). Die
    // Seite schickt hier selbst, also ohne die Rundung auf ganze Bildpunkte:
    // dieselbe Schranke wie drüben.
    s = await lies(halle);
    if (!s.an || Math.abs(s.x - 0.8) > 0.001 || Math.abs(s.y - 0.5) > 0.001) {
      klagen.push("11. nach dem Stoß stand der Punkt im Saal bei " + s.x + "/"
                  + s.y + " statt bei der letzten Stelle 0.8/0.5 -- die Drossel"
                  + " hält nicht den letzten Punkt");
    }
    // Und über die Zeit, wie in Chrome: vierzig einzeln abgewartete
    // Bewegungen über den Treiber, und keine Nachricht trägt mehr als einen
    // Punkt. Dieselbe Hälfte mit denselben zwei Klagen wie drüben, damit ein
    // Punkt auf beiden Seiten dasselbe heißt.
    await pult.ev(`window.__gezaehlt = []`);
    const a = px(0.20, 0.30), z = px(0.80, 0.60);
    for (let i = 1; i <= 40; i++) {
      await pult.schweb(a[0] + (z[0] - a[0]) * i / 40, a[1] + (z[1] - a[1]) * i / 40);
    }
    await schlaf(600);
    const gez = JSON.parse(await pult.ev(`JSON.stringify(window.__gezaehlt)`));
    if (!gez.length) klagen.push("11. gar nichts ging auf die Leitung");
    else if (Math.max(...gez) > 1) {
      klagen.push("11. eine Nachricht trug " + Math.max(...gez) + " Punkte --"
                  + " gebündelt statt gedrosselt (" + JSON.stringify(gez) + ")");
    }

    // ── 3: die Bühne verlassen ────────────────────────────────────────────
    await pult.schweb(3, 3);
    await schlaf(800);
    p = await lies(pult); s = await lies(halle);
    if (p.an || p.deckkraft > 0.02) {
      klagen.push("3. am Pult blieb der Punkt stehen, nachdem die Bühne"
                  + " verlassen war (an=" + p.an + ", Deckkraft " + p.deckkraft + ")");
    }
    if (s.an || s.deckkraft > 0.02) {
      klagen.push("3. im Saal blieb der Punkt stehen, nachdem die Bühne"
                  + " verlassen war (an=" + s.an + ", Deckkraft " + s.deckkraft + ")");
    }
    // Und bei gehaltener Taste, wie in Chrome (die Begründung steht dort):
    // Stift gedrückt, `m` mitten im Zug, hinausgezogen. Die Taste bleibt
    // zwischen zwei `input.performActions` unten -- BiDi hält den Zustand
    // einer Eingabequelle über die Rufe hinweg, bis `pointerUp` kommt.
    await werkzeug(pult, "stift"); await schlaf(400);
    const g0 = px(0.40, 0.50), g1 = px(0.60, 0.50), g2 = px(0.80, 0.50);
    const gDraussen = [bp[0] + bp[2] + 60, g2[1]];
    const ziehe = (liste) => pult.ruf("input.performActions", { context: pult.ctx,
      actions: [{ type: "pointer", id: "maus", parameters: { pointerType: "mouse" },
                  actions: liste }] });
    const nach = (q, dauer) => ({ type: "pointerMove", x: Math.round(q[0]),
                                  y: Math.round(q[1]), origin: "viewport",
                                  duration: dauer || 0 });
    await ziehe([nach(g0), { type: "pointerDown", button: 0 }, nach(g1, 100)]);
    await schlaf(300);
    await pult.taste("m"); await schlaf(300);
    await ziehe([nach(g2, 100)]); await schlaf(600);
    s = await lies(halle);
    if (!s.an) {
      klagen.push("3. mit gehaltener Taste stand nach dem Wechsel zum Zeiger"
                  + " gar kein Punkt -- dann sagt das Folgende nichts");
    } else {
      await ziehe([nach(gDraussen, 100)]); await schlaf(700);
      s = await lies(halle);
      if (s.an) {
        klagen.push("3. mit gehaltener Taste aus der Bühne gezogen, blieb der"
                    + " Punkt im Saal bei " + s.x + "/" + s.y + " stehen --"
                    + " der Fang hält `pointerleave` zurück, und die Stelle"
                    + " wurde nicht geprüft");
      }
    }
    await ziehe([{ type: "pointerUp", button: 0 }]); await schlaf(500);
    await pult.taste("x"); await schlaf(500);
    if (+(await halle.ev(STRICHE)) > 0) {
      klagen.push("3. der Strich vor dem Wechsel ging mit `x` nicht weg --"
                  + " Punkt 4 zählte sonst einen fremden Strich mit");
    }

    // ── 4 und 5: Stift, Strich, Reihenfolge im Baum ───────────────────────
    await werkzeug(pult, "stift"); await schlaf(400);
    const m = px(0.25, 0.45);
    const zug = [{ type: "pointerMove", x: Math.round(m[0]), y: Math.round(m[1]),
                   origin: "viewport" }, { type: "pointerDown", button: 0 }];
    for (let i = 1; i <= 10; i++) {
      zug.push({ type: "pointerMove", x: Math.round(m[0] + i * 14),
                 y: Math.round(m[1]), origin: "viewport" });
      zug.push({ type: "pause", duration: 30 });
    }
    zug.push({ type: "pointerUp", button: 0 });
    await pult.ruf("input.performActions", { context: pult.ctx, actions: [
      { type: "pointer", id: "maus", parameters: { pointerType: "mouse" },
        actions: zug }] });
    await schlaf(900);
    if (+(await halle.ev(STRICHE)) < 1) {
      klagen.push("4. ein Zug im Stiftmodus erzeugte im Saal keinen Strich");
    }
    s = await lies(halle);
    if (s.an) klagen.push("4. im Stiftmodus stand trotzdem ein Punkt");
    await werkzeug(pult, "zeiger"); await schlaf(300);
    await pult.schweb(m[0] + 70, m[1]);
    await schlaf(600);
    const lage = await halle.ev(`(function(){
      var i = document.getElementById('ts-ink'), p = document.getElementById('ts-punkt');
      if (!i || !p) return "fehlt";
      var z = [getComputedStyle(i).zIndex, getComputedStyle(p).zIndex].join("/");
      return z + " " + ((i.compareDocumentPosition(p) & 4) ? "dahinter" : "davor")
        + (i.parentNode === p.parentNode ? "" : " fremd");
    })()`);
    // Wie in Chrome: die Reihenfolge im Baum entscheidet nur bei gleicher
    // z-Stufe, also wird die Stufe selbst verglichen.
    const zs = String(lage).split(" ")[0].split("/").map(Number);
    if (!/dahinter/.test(lage) || / fremd/.test(lage) || !(zs[1] >= zs[0])) {
      klagen.push("5. die Punktebene liegt nicht über #ts-ink ("
                  + lage + ") -- ein Strich verdeckte den Punkt");
    }
    await pult.taste("x"); await schlaf(500);

    // ── 6: die Rahmenfolie ────────────────────────────────────────────────
    await aufFolie(folien.mit); await schlaf(1100);
    await werkzeug(pult, "zeiger"); await schlaf(300);
    const knopf = JSON.parse(await pult.ev(`(function(){
      var f = document.querySelector('.ts-el iframe');
      var r = f.getBoundingClientRect();
      var kn = f.contentDocument.getElementById('knopf').getBoundingClientRect();
      var sk = parseFloat(f.dataset.skala) || parseFloat(f.style.zoom) || 1;
      return JSON.stringify({ x: r.left + (kn.left + kn.width / 2) * sk,
                              y: r.top + (kn.top + kn.height / 2) * sk });
    })()`));
    await pult.ev(LEER); await halle.ev(LEER);
    await pult.schweb(knopf.x, knopf.y);
    await schlaf(600);
    const beimSchweben = await halle.ev(LOG);
    if (!/^0\//.test(String(beimSchweben))) {
      klagen.push("6. das bloße Schweben schickte schon etwas in den Rahmen ("
                  + beimSchweben + ") -- ein Zeigen ist kein Bedienen");
    }
    s = await lies(halle);
    if (!s.an) klagen.push("6. über dem Rahmen stand kein Punkt");
    await pult.maus("down", knopf.x, knopf.y);
    await schlaf(150);
    await pult.maus("up", knopf.x, knopf.y);
    await schlaf(900);
    for (const [wo, w] of [["Saal", halle], ["Pult", pult]]) {
      const l = String(await w.ev(LOG)), teil = l.split("/");
      if (+teil[1] !== 1) {
        klagen.push("6. im " + wo + " zählte der Knopf " + teil[1] + " statt 1"
                    + " -- der Punkt hat den Rahmenweg gekostet (" + l + ")");
      }
    }

    // Und der Zug und das Rad, wie in Chrome (die Begründung steht dort).
    // Die Taste bleibt zwischen zwei `input.performActions` unten, wie in
    // Punkt 3; das Rad ist eine eigene Eingabequelle (`wheel`).
    const rahmen = JSON.parse(await pult.ev(`(function(){
      var q = document.querySelector('.ts-el iframe').getBoundingClientRect();
      return JSON.stringify([q.left, q.top, q.width, q.height]); })()`));
    const imRahmen = (fx, fy) => [rahmen[0] + rahmen[2] * fx, rahmen[1] + rahmen[3] * fy];
    await pult.ev(LEER); await halle.ev(LEER);
    await pult.maus("down", knopf.x, knopf.y); await schlaf(150);
    for (const [fx, fy] of [[0.45, 0.45], [0.55, 0.55], [0.65, 0.65]]) {
      await pult.schweb(...imRahmen(fx, fy)); await schlaf(150);
    }
    await pult.maus("up", ...imRahmen(0.65, 0.65)); await schlaf(900);
    await pult.ruf("input.performActions", { context: pult.ctx, actions: [
      { type: "wheel", id: "rad", actions: [{ type: "scroll",
        x: Math.round(knopf.x), y: Math.round(knopf.y), deltaX: 0, deltaY: 120 }] }] });
    await schlaf(900);
    for (const [wo, w] of [["Saal", halle], ["Pult", pult]]) {
      const e = String(await w.ev(ARTEN)).split(",");
      const zug = e.filter(x => x === "pointermove:1@knopf").length;
      const fremd = e.filter(x => /^pointer(move:1|up:0)@feld$/.test(x)).length;
      if (!zug || fremd || e.indexOf("pointerup:0@knopf") < 0) {
        klagen.push("6. im " + wo + " kam der Zug nicht beim Knopf an, der den"
                    + " Druck genommen hatte (" + zug + " Bewegungen dort, "
                    + fremd + " daneben) -- ein Punkt im Rahmen ließe sich"
                    + " nicht mehr ziehen");
      }
      if (e.indexOf("wheel:0@knopf") < 0) {
        klagen.push("6. im " + wo + " kam das Rad nicht im Rahmen an ("
                    + e.filter(x => /^wheel/.test(x)).length + " Radereignisse)"
                    + " -- eine Konstruktion ließe sich nicht mehr zoomen");
      }
    }

    // ── 7: schwarz ────────────────────────────────────────────────────────
    await pult.taste("b"); await schlaf(600);
    await pult.schweb(knopf.x + 30, knopf.y + 30);
    await schlaf(500);
    s = await lies(halle);
    if (s.deckkraft > 0.02) {
      klagen.push("7. unter `b` blieb der Punkt im Saal sichtbar (Deckkraft "
                  + s.deckkraft + ")");
    }
    await pult.taste("b"); await schlaf(600);

    // ── 8: eingefroren ────────────────────────────────────────────────────
    //
    // Der Punkt, der beim Einfrieren SCHON steht, und die Hand bleibt dabei
    // liegen. Gemessen war das der Unterschied: die Schranke im Saal fing,
    // was während des Frosts ankam, den stehenden Punkt nahm sie nicht mit.
    await halle.ev(LEER);
    await aufFolie(folien.ohne); await schlaf(900);
    await werkzeug(pult, "zeiger"); await schlaf(300);
    await pult.schweb(...px(0.35, 0.35)); await schlaf(600);
    s = await lies(halle);
    if (!s.an) {
      klagen.push("8. vor dem Einfrieren stand im Saal gar kein Punkt --"
                  + " dann sagt das Folgende nichts");
    }
    await pult.taste("e"); await schlaf(800);
    s = await lies(halle);
    if (s.an) {
      klagen.push("8. das Einfrieren ließ den schon stehenden Punkt im Saal"
                  + " bei " + s.x + "/" + s.y + " stehen -- er ging erst weg,"
                  + " als die Hand sich wieder bewegte");
    }
    await pult.taste("ArrowRight"); await schlaf(400);
    await pult.taste("ArrowRight"); await schlaf(700);
    s = await lies(halle);
    if (s.an) {
      klagen.push("8. eingefroren stand im Saal weiter ein Punkt, während das"
                  + " Pult zwei Folien weiter war -- er zeigte auf eine"
                  + " Folie, die niemand mehr meint");
    }
    await aufFolie(folien.ohne); await schlaf(900);
    await pult.schweb(...px(0.40, 0.40)); await schlaf(500);
    await pult.maus("down", ...px(0.40, 0.40)); await schlaf(150);
    await pult.maus("up", ...px(0.40, 0.40)); await schlaf(600);
    s = await lies(halle);
    if (s.an) klagen.push("8. eingefroren nahm der Saal trotzdem einen Punkt an");
    const frostLog = await halle.ev(LOG);
    if (!/^0\//.test(String(frostLog).split(" ")[0]) && frostLog !== "(kein Rahmen)") {
      klagen.push("8. eingefroren kam trotzdem etwas im Rahmen des Saals an ("
                  + frostLog + ")");
    }
    await pult.taste("e"); await schlaf(900);

    // ── 9: der Finger ─────────────────────────────────────────────────────
    await aufFolie(folien.ohne); await schlaf(800);
    await werkzeug(pult, "zeiger"); await schlaf(300);
    const f1 = px(0.20, 0.30), f2 = px(0.60, 0.60);
    await pult.finger("down", f1[0], f1[1]); await schlaf(200);
    await pult.finger("move", f2[0], f2[1]); await schlaf(600);
    s = await lies(halle);
    if (!s.an) klagen.push("9. ein gehaltener Finger setzte keinen Punkt");
    await pult.finger("up", f2[0], f2[1]); await schlaf(800);
    s = await lies(halle);
    if (s.an) {
      klagen.push("9. der Punkt blieb hängen, nachdem der Finger gehoben war");
    }

    // ── 10: Schritt hält, Folie nimmt ─────────────────────────────────────
    if (folien.viele >= 0) {
      await aufFolie(folien.viele); await schlaf(800);
      await werkzeug(pult, "zeiger"); await schlaf(300);
      await pult.schweb(...px(0.50, 0.50)); await schlaf(600);
      const vorher = JSON.parse(await pult.ev(`JSON.stringify(typstage.pruef.stand())`));
      await pult.taste("ArrowRight"); await schlaf(1000);
      const nachher = JSON.parse(await pult.ev(`JSON.stringify(typstage.pruef.stand())`));
      s = await lies(halle);
      if (nachher.folie === vorher.folie) {
        if (!s.an) {
          klagen.push("10. ein Schrittwechsel auf derselben Folie nahm den"
                      + " Punkt -- wer die nächste Zeile aufdeckt, meint"
                      + " weiter denselben Begriff");
        }
      } else {
        klagen.push("10. der Pfeil sprang gleich auf die nächste Folie --"
                    + " die Probe misst den Schrittwechsel dann nicht");
      }
      for (let i = 0; i < 4; i++) {
        await pult.taste("ArrowRight"); await schlaf(300);
      }
      await schlaf(900);
      const weit = JSON.parse(await pult.ev(`JSON.stringify(typstage.pruef.stand())`));
      s = await lies(halle);
      // Erst laut, wenn dieser Teil gar nicht laufen KANN -- eine stille
      // Bedingung, die nie wahr wird, steht in der Liste, als wäre sie
      // gemessen.
      if (weit.folie === vorher.folie) {
        klagen.push("10. vier Pfeile führten von Folie " + vorher.folie
                    + " nicht auf eine andere -- hinter der mehrschrittigen"
                    + " Folie fehlt eine weitere, und der Folienwechsel bleibt"
                    + " ungeprüft");
      } else if (s.an) {
        klagen.push("10. ein Folienwechsel ließ den Punkt stehen -- er zeigte"
                    + " dann auf etwas, das nicht mehr da ist");
      }
    }

    // ── 15: der Griff zum Stift, bei liegender Hand ───────────────────────
    //
    // Punkt 4 misst das NICHT: dort ist die Hand vorher von der Bühne
    // gefahren, der Punkt also schon aus, und die Zeile in `modusSetzen`
    // läuft ins Leere. Gemessen: mit ihr herausgenommen blieben BEIDE Proben
    // grün. Beide Wege, Knopf und Taste -- dass sie durch dieselbe Funktion
    // gehen, ist schon einmal nicht gestimmt.
    // Zwei verschiedene Stellen: `input.performActions` verschluckt einen Zug
    // auf den alten Ort, und der zweite Durchgang faende dann gar keinen
    // Punkt vor. Gemessen -- genau daran klagte diese Probe zuerst.
    const stellen = [[0.38, 0.62], [0.42, 0.58]];
    let nr = 0;
    for (const [wie, greifen] of [["über den Knopf", () => werkzeug(pult, "stift")],
                                  ["mit der Taste `m`", () => pult.taste("m")]]) {
      await aufFolie(folien.ohne); await schlaf(800);
      await werkzeug(pult, "zeiger"); await schlaf(300);
      await pult.schweb(...px(...stellen[nr++])); await schlaf(600);
      s = await lies(halle);
      if (!s.an) {
        klagen.push("15. vor dem Griff zum Stift (" + wie + ") stand im Saal"
                    + " gar kein Punkt -- dann sagt das Folgende nichts");
        continue;
      }
      await greifen(); await schlaf(700);
      p = await lies(pult); s = await lies(halle);
      if (p.an) {
        klagen.push("15. am Pult blieb der Punkt stehen, nachdem " + wie
                    + " zum Stift gegriffen war");
      }
      if (s.an) {
        klagen.push("15. im Saal blieb der Punkt bei " + s.x + "/" + s.y
                    + " stehen, nachdem " + wie + " zum Stift gegriffen war --"
                    + " die Hand lag dabei still");
      }
    }

    // ── 14: das Fenster verliert den Fokus ────────────────────────────────
    //
    // Hier ECHT und nicht gestellt: `browsingContext.activate` auf den Saal
    // nimmt dem Pult den Fokus, gemessen geht `document.hasFocus()` dort von
    // `true` auf `false`. Das ist mehr, als die Chrome-Probe messen kann.
    //
    // Steht am Ende dieses Blocks, weil der Saal danach vorn ist und ein
    // Fenster im Hintergrund seine Bilder nicht mehr zeichnet -- die Drossel
    // hängt an `requestAnimationFrame`, und danach käme kein Punkt mehr
    // zustande.
    await aufFolie(folien.ohne); await schlaf(800);
    await werkzeug(pult, "zeiger"); await schlaf(300);
    await pult.schweb(...px(0.45, 0.55)); await schlaf(600);
    s = await lies(halle);
    const fokusVor = await pult.ev("document.hasFocus()");
    if (!s.an) {
      klagen.push("14. vor dem Fokusverlust stand im Saal gar kein Punkt --"
                  + " dann sagt das Folgende nichts");
    }
    await halle.aktiviere(); await schlaf(900);
    const fokusNach = await pult.ev("document.hasFocus()");
    if (fokusVor !== true || fokusNach !== false) {
      klagen.push("14. das Pult hat den Fokus gar nicht verloren (hasFocus "
                  + fokusVor + " → " + fokusNach + ") -- dann misst dieser"
                  + " Punkt nichts");
    }
    p = await lies(pult); s = await lies(halle);
    if (p.an) {
      klagen.push("14. am Pult blieb der Punkt stehen, nachdem das Fenster den"
                  + " Fokus verloren hatte (" + p.x + "/" + p.y + ")");
    }
    if (s.an) {
      klagen.push("14. im Saal blieb der Punkt bei " + s.x + "/" + s.y
                  + " stehen, nachdem das Pultfenster den Fokus verloren hatte"
                  + " -- das Handbuch verspricht, dass er dabei ausgeht");
    }
    await pult.ende(); await halle.ende();
  }

  // ═══ 13: der spiegelnde Rahmen ════════════════════════════════════════════
  {
    const { halle, pult } = await zweiFenster(spiegelDeck, 1600, 900, 1120, 760);
    const folie = JSON.parse(await pult.ev(`(function(){
      for (var i = 0; i < typstage.slides.length; i++) {
        if (typstage.slides[i].querySelector('.ts-el[data-spiegel="1"]')) {
          return JSON.stringify(i);
        }
      } return JSON.stringify(-1); })()`));
    if (folie < 0) {
      klagen.push("13. im Probedeck meldete sich kein spiegelnder Rahmen --"
                  + " die Probe misst dann nichts");
    } else {
      await pult.ev(`(function(){
        for (var n = 0; n < typstage.steps.length; n++) {
          if (typstage.steps[n].slide === ${folie}) { typstage.goto(n, true); return n; }
        } return -1; })()`);
      await schlaf(1400);
      await werkzeug(pult, "zeiger"); await schlaf(400);
      const bp = await buehne(pult);
      const r = JSON.parse(await pult.ev(`(function(){
        var e = document.querySelector('.ts-el[data-spiegel="1"]');
        var f = e.querySelector('iframe'), q = f.getBoundingClientRect();
        var kn = f.contentDocument.getElementById('knopf').getBoundingClientRect();
        var sk = parseFloat(f.dataset.skala) || parseFloat(f.style.zoom) || 1;
        return JSON.stringify({ mx: q.left + q.width / 2, my: q.top + q.height / 2,
          kx: q.left + (kn.left + kn.width / 2) * sk,
          ky: q.top + (kn.top + kn.height / 2) * sk,
          pe: getComputedStyle(e).pointerEvents }); })()`));
      if (r.pe !== "auto") {
        klagen.push("13. der spiegelnde Rahmen bekam im Zeigermodus"
                    + " pointer-events: " + r.pe + " statt auto -- dann misst"
                    + " diese Probe den Fall gar nicht");
      }
      await pult.schweb(bp[0] + bp[2] * 0.5, bp[1] + bp[3] * 0.08);
      await schlaf(700);
      const neben = await lies(halle);
      if (!neben.an) {
        klagen.push("13. neben dem spiegelnden Rahmen stand schon kein Punkt --"
                    + " dann sagt das Folgende nichts");
      }
      await pult.schweb(r.mx, r.my);
      await schlaf(1000);
      const drin = await lies(halle);
      if (drin.an) {
        klagen.push("13. über dem spiegelnden Rahmen blieb der Punkt im Saal"
                    + " bei " + drin.x + "/" + drin.y + " stehen, während die"
                    + " Hand im Rahmen arbeitete");
      }
      await pult.ev(LEER);
      await pult.maus("down", r.kx, r.ky);
      await schlaf(150);
      await pult.maus("up", r.kx, r.ky);
      await schlaf(900);
      const log = String(await pult.ev(LOG)).split("/");
      if (+log[1] !== 1) {
        klagen.push("13. im spiegelnden Rahmen zählte der Knopf am Pult "
                    + log[1] + " statt 1 (" + log.join("/") + ")");
      }
    }
    await pult.ende(); await halle.ende();
  }

  // ═══ 17: das Pult geht zu ═════════════════════════════════════════════════
  //
  // Wie in Chrome, und die Begründung steht dort. Geschlossen wird hier mit
  // `browsingContext.close` -- dem Weg, den BiDi für ein Fenster hat, das
  // jemand zumacht; gezählt wird danach über `browsingContext.getTree`, ob
  // es wirklich zu ist.
  {
    const { halle, pult } = await zweiFenster(mitPunkt, 1600, 900, 1120, 760);
    const seiten = async () =>
      (await halle.ruf("browsingContext.getTree", {})).result.contexts.length;
    const bp = await buehne(pult);
    await pult.ev(`(function(){
      for (var n = 0; n < typstage.steps.length; n++) {
        if (typstage.steps[n].slide === 1) { typstage.goto(n, true); return n; }
      } return -1; })()`);
    await schlaf(800);
    await werkzeug(pult, "zeiger"); await schlaf(300);
    await pult.schweb(bp[0] + bp[2] * 0.25, bp[1] + bp[3] * 0.75);
    await schlaf(700);
    let s = await lies(halle);
    // Erst das Neuladen, wie in Chrome (die Begründung steht dort).
    if (!s.an) {
      klagen.push("17. vor dem Neuladen des Pults stand im Saal gar kein"
                  + " Punkt -- dann sagt das Folgende nichts");
    } else {
      await pult.ruf("browsingContext.reload", { context: pult.ctx, wait: "none" });
      const t1 = Date.now();
      while (Date.now() - t1 < 6000) {
        await schlaf(250);
        s = await lies(halle);
        if (!s.an) break;
      }
      if (s.an) {
        klagen.push("17. im Saal stand der Punkt sechs Sekunden nach dem"
                    + " Neuladen des Pults noch bei " + s.x + "/" + s.y
                    + " -- er zeigte für eine Hand, die es nicht mehr gibt");
      }
      await schlaf(2500);
      await werkzeug(pult, "zeiger"); await schlaf(300);
      const bq = await buehne(pult);
      await pult.schweb(bq[0] + bq[2] * 0.3, bq[1] + bq[3] * 0.7);
      await schlaf(700);
      s = await lies(halle);
    }
    const vorher = await seiten();
    if (!s.an) {
      klagen.push("17. vor dem Schließen des Pults stand im Saal gar kein"
                  + " Punkt -- dann sagt das Folgende nichts");
    } else {
      await pult.ende();
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        await schlaf(250);
        s = await lies(halle);
        if (!s.an) break;
      }
      const nachher = await seiten();
      if (nachher !== vorher - 1) {
        klagen.push("17. das Pult ging nicht zu (" + vorher + " Fenster vorher, "
                    + nachher + " nachher) -- dann misst dieser Punkt nichts");
      } else if (s.an) {
        klagen.push("17. im Saal stand der Punkt sechs Sekunden nach dem"
                    + " Schließen des Pults noch bei " + s.x + "/" + s.y
                    + " -- er zeigte für eine Hand, die es nicht mehr gibt");
      }
    }
    await halle.ende();
  }

  // ═══ 16: Farbe und Gestalt, gemessen im BILD des Saals ════════════════════
  //
  // Dasselbe Verfahren wie in Chrome, und es steht an einem Ort
  // (`decklauf/zeigerdeck.js`, `ringMessen`):
  //
  //   Saalfenster 1600x900, Punkt auf 0,5/0,5, Bildschirmfoto unskaliert.
  //   Mitte und Radius aus `pruef.zeiger()`. Grund = häufigste Farbe auf dem
  //   Kreis mit 2,5 Radien (32 Richtungen), Kern auf 0,25, heller Ring auf
  //   0,57 und dunkler Ring auf 0,71 Radien (je 16 Richtungen). Kontrast
  //   zwischen Ring und Grund nach WCAG 2.1.
  for (const ring of RINGE) {
    const { halle, pult } = await zweiFenster(grundDecks[ring.deck],
                                              1600, 900, 1120, 760);
    const bp = await buehne(pult);
    await pult.ev(`(function(){
      for (var n = 0; n < typstage.steps.length; n++) {
        if (typstage.steps[n].slide === 1) { typstage.goto(n, true); return n; }
      } return -1; })()`);
    await schlaf(800);
    await werkzeug(pult, "zeiger"); await schlaf(300);
    await pult.schweb(bp[0] + bp[2] * 0.5, bp[1] + bp[3] * 0.5);
    await schlaf(800);
    const z = await lies(halle);
    const akzent = String(await halle.ev(AKZENT) || "");
    if (!z.ebene || !z.an) {
      klagen.push("16. auf `themes." + ring.thema + "` stand im Saal kein"
                  + " Punkt -- dann ist weder Farbe noch Gestalt zu messen");
      await pult.ende(); await halle.ende();
      continue;
    }
    const sr = await buehne(halle);
    const g = ringMessen(await halle.bild(), sr, z);
    process.stderr.write("Firefox/" + ring.thema + ": Grund "
      + g.grund.farbe.join(",") + " · Kern " + g.kern.farbe.join(",")
      + " (Akzent " + akzent + ", Kontrast " + g.kKern + ") · heller Ring "
      + g.hell.farbe.join(",") + " K=" + g.kHell + " · dunkler Ring "
      + g.dunkel.farbe.join(",") + " K=" + g.kDunkel + " · Kern reicht "
      + g.weite.achsen + " px gerade und " + g.weite.schraeg
      + " px schräg von r=" + g.r + "\n");

    if (!nahe(g.kern.farbe, farbeZahlen(akzent), 6)) {
      klagen.push("16. auf `themes." + ring.thema + "` misst der Kern im"
                  + " Saalbild " + g.kern.farbe.join(",") + " statt des"
                  + " Deckakzents " + akzent + " -- der Punkt trägt die"
                  + " Vorgabefarbe nicht");
    }
    const summe = (c) => c[0] + c[1] + c[2];
    if (summe(g.hell.farbe) <= summe(g.dunkel.farbe)) {
      klagen.push("16. auf `themes." + ring.thema + "` liegt um den Kern kein"
                  + " Paar aus hellem und dunklem Ring (innen "
                  + g.hell.farbe.join(",") + ", außen " + g.dunkel.farbe.join(",")
                  + ") -- genau dieses Paar trägt den Kontrast, gleich welche"
                  + " Farbe der Kern hat");
    }
    const ist = ring.welcher === "hell" ? g.kHell : g.kDunkel;
    if (Math.abs(ist - ring.soll) > 0.15) {
      klagen.push("16. " + ring.wort + " " + ist + " statt " + ring.soll
                  + " (Grund " + g.grund.farbe.join(",") + ") -- dieselbe Zahl"
                  + " steht im CHANGELOG, in beiden Handbüchern und im"
                  + " Kommentar der Laufzeit");
    }
    if (g.weite.achsen > 0 &&
        Math.abs(g.weite.schraeg / g.weite.achsen - 1) > 0.15) {
      klagen.push("16. auf `themes." + ring.thema + "` reicht der Kern gerade "
                  + g.weite.achsen + " px und schräg " + g.weite.schraeg
                  + " px -- er ist nicht rund");
    }
    if (Math.abs(g.weite.achsen - g.r * 0.5) > g.r * 0.2) {
      klagen.push("16. auf `themes." + ring.thema + "` füllt der Kern "
                  + g.weite.achsen + " px von " + g.r + " px Radius statt der"
                  + " halben -- dann bleibt für die zwei Ringe kein Platz");
    }
    await pult.ende(); await halle.ende();
  }

  // ═══ 12a: gestellt -- eigene Farbe, eigene Größe ══════════════════════════
  {
    const { halle, pult } = await zweiFenster(gestellt, 1600, 900, 1120, 760);
    const bp = await buehne(pult);
    await pult.ev(`typstage.goto(1, true)`); await schlaf(800);
    await werkzeug(pult, "zeiger"); await schlaf(300);
    await pult.schweb(bp[0] + bp[2] * 0.5, bp[1] + bp[3] * 0.5);
    await schlaf(700);
    const s = await lies(halle);
    if (!s.ebene || !s.an) {
      klagen.push("12. mit `room: (pointer: (color, size))` kam kein Punkt");
    } else {
      if (Math.abs(s.anteil - 4) > 0.2) {
        klagen.push("12. `size: 4%` ergab " + s.anteil + " % der Bühne");
      }
      if (!/00c853/i.test(s.farbe)) {
        klagen.push("12. `color: rgb(\"#00c853\")` ergab --ts-zeiger: "
                    + JSON.stringify(s.farbe));
      }
    }
    await pult.ende(); await halle.ende();
  }

  // ═══ 12b: abbestellt -- keine Ebene, und die alte Meldung wird wahr ═══════
  {
    const { halle, pult } = await zweiFenster(ohnePunkt, 1600, 900, 1120, 760);
    const bp = await buehne(pult);
    const folien = JSON.parse(await pult.ev(`(function(){
      var mit = -1, ohne = -1;
      for (var i = 0; i < typstage.slides.length; i++) {
        var r = typstage.slides[i].querySelectorAll('.ts-el iframe').length;
        if (r && mit < 0) mit = i; else if (!r && ohne < 0) ohne = i;
      }
      return JSON.stringify({ mit: mit, ohne: ohne }); })()`));
    const aufFolie = (f) => pult.ev(`(function(){
      for (var n = 0; n < typstage.steps.length; n++) {
        if (typstage.steps[n].slide === ${f}) { typstage.goto(n, true); return n; }
      } return -1; })()`);
    const hinweis = () => pult.ev(
      `document.getElementById('ts-hint').textContent.trim()`);

    await aufFolie(folien.ohne); await schlaf(800);
    // Der Knopf.
    await werkzeug(pult, "stift"); await schlaf(400);
    await pult.ev(`document.getElementById('ts-hint').textContent = ""`);
    await werkzeug(pult, "zeiger"); await schlaf(500);
    if (!(await hinweis())) {
      klagen.push("12. mit `pointer: false` schwieg der KNOPF auf einer"
                  + " Textfolie -- die Meldung hängt wieder nur an der Taste");
    }
    // Und die Taste.
    await werkzeug(pult, "stift"); await schlaf(400);
    await pult.ev(`document.getElementById('ts-hint').textContent = ""`);
    await pult.taste("m"); await schlaf(500);
    if (!(await hinweis())) {
      klagen.push("12. mit `pointer: false` schwieg die TASTE `m` auf einer"
                  + " Textfolie");
    }
    // Auf einer Rahmenfolie gibt es etwas zu zeigen, also schweigt sie.
    await werkzeug(pult, "stift"); await schlaf(300);
    await aufFolie(folien.mit); await schlaf(1100);
    await pult.ev(`document.getElementById('ts-hint').textContent = ""`);
    await werkzeug(pult, "zeiger"); await schlaf(500);
    const amRahmen = await hinweis();
    if (amRahmen) {
      klagen.push("12. auf einer Rahmenfolie sagte das Pult trotzdem "
                  + JSON.stringify(amRahmen) + " -- dort gibt es etwas zu zeigen");
    }
    // Und die Ebene entsteht gar nicht erst.
    await aufFolie(folien.ohne); await schlaf(800);
    await pult.schweb(bp[0] + bp[2] * 0.4, bp[1] + bp[3] * 0.4);
    await schlaf(600);
    const sp = await lies(pult), sa = await lies(halle);
    if (sp.ebene || sa.ebene) {
      klagen.push("12. mit `pointer: false` entstand trotzdem eine Punktebene"
                  + " (Pult " + sp.ebene + ", Saal " + sa.ebene + ")");
    }
    if (!sp.aus || !sa.aus) {
      klagen.push("12. `pruef.zeiger().aus` meldet Pult " + sp.aus + ", Saal "
                  + sa.aus + " -- mit `room: (pointer: false)` muss beides"
                  + " wahr sein, sonst ist „keine Ebene\" nicht von „noch"
                  + " nie gezeigt\" zu unterscheiden");
    }
    await pult.ende(); await halle.ende();
  }

  if (klagen.length) {
    console.log("Zeiger (Firefox): " + klagen.length + " Punkt(e)\n");
    klagen.forEach(k => console.log("  • " + k));
    process.exit(1);
  }
  console.log("Zeiger (Firefox): in Ordnung");
  process.exitCode = 0;
})();
