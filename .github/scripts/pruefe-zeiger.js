// pruefe-zeiger.js — zeigt der Zeiger auch dort, wo kein Rahmen liegt?
//
// Gemeldet war „the pointer in presenter view does not work". Gemessen war es
// kein Fehler, sondern eine Lücke: der Zeigermodus reichte die Maus in
// eingebettete Rahmen durch und tat auf einer gewöhnlichen Folie nichts. Seit
// es den Leuchtpunkt gibt, zeigt jede Folie -- und diese Probe hält beide
// Fähigkeiten desselben Modus nebeneinander fest, damit die eine die andere
// nicht wieder verdrängt.
//
//   node .github/scripts/pruefe-zeiger.js [--browser /pfad]
//
// Eigens im Browser und eigens mit ZWEI echten Fenstern (Taste `n`): der Punkt
// reist über `postMessage`, und mit nur einem Fenster sähe keine Probe, ob er
// drüben ankommt. Die Bühnen sind dabei absichtlich verschieden groß --
// gemessen 622 px am Pult (Fenster 1120x760) gegen 1600 px im Saal --, denn der
// Punkt steht in Bruchteilen der Bühne und darf sich von Pixeln nicht beirren
// lassen.
//
// Geprüft wird:
//   1. Schweben ohne Druck setzt den Punkt im Saal an dieselbe Stelle wie am
//      Pult, auf 0,001 der Bühne genau.
//   2. Er ist in beiden Fenstern 2,2 % der Bühne breit -- der Vorgabewert.
//   3. Die Bühne verlassen nimmt ihn, in beiden Fenstern -- auch mit
//      gehaltener Taste, nachdem mitten im Strich zum Zeiger gewechselt
//      wurde und der Zeiger noch gefangen ist.
//   4. Im Stiftmodus gibt es keinen Punkt, und ein Zug erzeugt weiterhin einen
//      Strich im Saal.
//   5. Die Punktebene liegt über `#ts-ink` -- mindestens auf dessen z-Stufe
//      und im Baum dahinter, also über jedem Strich. Ein Punkt, den ein
//      Strich verdeckt, zeigte auf nichts.
//   6. Auf einer Rahmenfolie schickt das Schweben NICHTS in den Rahmen, und
//      ein Klick, ein Zug und das Rad bedienen ihn weiterhin -- der Zug
//      bleibt dabei bei dem Knopf, der den Druck genommen hat. Das ist die
//      Fähigkeit, die es vorher schon gab, und sie darf der Punkt nicht
//      kosten.
//   7. `b` macht den Punkt unsichtbar.
//   8. Einfrieren nimmt den Punkt, der schon steht -- ohne dass die Hand
//      sich bewegt --, und danach nimmt der Saal weder einen neuen Punkt noch
//      ein Rahmenereignis an.
//   9. Mit dem Finger: Punkt beim Berühren, fort beim Heben.
//  10. Ein Schrittwechsel hält den Punkt, ein Folienwechsel nimmt ihn.
//  11. Die Drossel: viele Bewegungen in einem Ablauf ergeben eine Nachricht
//      mit einem Punkt, und zwar dem letzten. Ohne sie stünden vierzig auf
//      der Leitung, von denen nur der letzte etwas bewegt.
//  12. `room: (pointer: false)` legt die Ebene gar nicht erst an, und erst
//      dann sagt `pointerNone` wieder die Wahrheit -- auf beiden Wegen, Knopf
//      und Taste, und auf einer Rahmenfolie nicht.
//  13. Über einem `spiegel`-Rahmen geht der Punkt AUS, statt an der zuletzt
//      gezeigten Stelle stehen zu bleiben -- und der Rahmen lässt sich dabei
//      weiter bedienen. Der spiegelnde Rahmen bekommt im Zeigermodus
//      `pointer-events:auto` (Stilblatt), die Bühne sieht die Bewegung dann
//      nicht mehr, und aus einem iframe treten Ereignisse nicht nach außen;
//      `pointerleave` hilft nicht, weil der Rahmen IN der Bühne liegt.
//      Gemessen an einem GeoGebra-Applet: vorher stand der Punkt im Saal auf
//      0,030/0,522, während der Sprecher auf 0,361/0,522 zeigte.
//  14. Der Fokusverlust des Pultfensters nimmt den Punkt -- der dritte der
//      vier Anlässe, die das Handbuch aufzählt („wenn man die Folienkopie
//      verlässt, wenn das Fenster den Fokus verliert, wenn man zum Stift
//      greift, und beim Folienwechsel").
//  15. Der Griff zum Stift nimmt den Punkt, auch wenn die Hand dabei LIEGEN
//      bleibt -- über den Knopf und über die Taste `m`. Punkt 4 misst das
//      nicht: dort war die Hand vorher von der Bühne gefahren, der Punkt also
//      schon aus, und die Zeile in `modusSetzen` lief ins Leere.
//  16. Farbe und Gestalt, gemessen im BILD des Saals: der Kern trägt den
//      Akzent des Decks, um ihn liegen ein heller und ein dunkler Ring, und
//      er ist rund. Auf hellem Grund (`themes.default`) trägt der dunkle Ring
//      den Kontrast, auf `themes.night` der helle -- beide Male gemessen und
//      mitgeschrieben, denn dieselben zwei Zahlen stehen im CHANGELOG, in
//      beiden Handbüchern und im Kommentar der Laufzeit.
//  17. Das Pult lädt neu oder geht zu, während im Saal ein Punkt steht: der
//      Saal nimmt ihn von selbst, denn ein `weg` kann niemand mehr schicken.
//
// Eigenes Deck für 13: zwei Rahmen in EINEM Deck brächten die Ablesung von
// Punkt 6 durcheinander (`LOG` reiht alle Rahmen des Dokuments auf). Eigenes
// Deck für 16: die Ringe brauchen einen dunklen Grund daneben, sonst bleibt
// der helle Ring ungemessen.
//
// Die vier Anlässe des Handbuchs, jeder an genau einer Stelle gemessen --
// Bühne verlassen 3, Fokusverlust 14, Stiftgriff 15, Folienwechsel 10.
// Dazu die drei, die CHANGELOG und Laufzeit nennen: Einfrieren 8, der
// spiegelnde Rahmen 13 und das geschlossene Pult 17. Gemessen, bevor 14 und
// 15 dazukamen: eine Mutation, die den Fokushaken entkernt, und eine, die die
// `weg`-Zeile aus `modusSetzen` nimmt, ließen BEIDE Proben grün -- zwei der
// vier Zusagen standen ungeprüft da. Dasselbe galt vor 17 für das
// geschlossene Pult.
const { starte, schlaf } = require("./decklauf/cdp.js");
const path = require("path");

const WURZEL = path.resolve(__dirname, "..", "..");
const arg = (n, v) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : v; };
const CHROME = arg("--browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");

// Decks und Leseausdruecke liegen in `decklauf/zeigerdeck.js`, weil die
// Firefox-Probe daneben dieselben braucht.
const { MIT_PUNKT, OHNE_PUNKT, GESTELLT, SPIEGEL, HELL, NACHT, RINGE, PUNKT,
        FASSUNG, NOETIG, LOG, ARTEN, LEER, STRICHE, AKZENT, BUEHNE, bauen, paketpfad,
        ringMessen, farbeZahlen, nahe } = require("./decklauf/zeigerdeck.js");


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
    console.log("Zeiger: ein Probedeck übersetzt nicht -- " + wort);
    process.exit(1);
  }

  const klagen = [];
  // Maus und Finger, wie das Protokoll sie kennt. Ein Schweben trägt
  // `buttons: 0` -- daran unterscheidet die Laufzeit es vom Zug.
  const maus = (w, t, x, y) => w.ruf("Input.dispatchMouseEvent", {
    type: t, x, y, button: "left", clickCount: 1, pointerType: "mouse",
    buttons: t === "mouseReleased" ? 0 : 1 });
  const schweb = (w, x, y) => w.ruf("Input.dispatchMouseEvent", {
    type: "mouseMoved", x, y, button: "none", buttons: 0, pointerType: "mouse" });
  const finger = (w, t, x, y) => w.ruf("Input.dispatchTouchEvent", {
    type: t, touchPoints: t === "touchEnd" ? [] : [{ x, y, id: 1 }] });

  async function zweiFenster(datei, saalB, saalH, pultB, pultH) {
    const halle = await starte(CHROME);
    await halle.navigiere("file://" + datei);
    await schlaf(1600);
    await halle.ruf("Emulation.setDeviceMetricsOverride",
      { width: saalB, height: saalH, deviceScaleFactor: 1, mobile: false });
    const kommt = halle.zweites();
    await halle.taste("n");
    const pult = await kommt;
    await schlaf(2200);
    await pult.ruf("Emulation.setDeviceMetricsOverride",
      { width: pultB, height: pultH, deviceScaleFactor: 1, mobile: false });
    await schlaf(1200);
    return { halle, pult };
  }

  // ═══ Der Regelfall: Punkt an ══════════════════════════════════════════════
  {
    const { halle, pult } = await zweiFenster(mitPunkt, 1600, 900, 1120, 760);
    const lies = async (w) => JSON.parse(await w.ev(PUNKT));
    // Erst die Oberflaeche, dann die Messung. Ein Deck, dessen Laufzeit
    // `zeiger()` noch nicht kennt, gaebe sonst in jedem Punkt dieser Probe
    // still eine Null zurueck und sähe aus wie ein kaputter Zeiger.
    // (`punkt()` gibt es getrennt davon: es ist seit den cue-Gruppen der
    // Pfeil einer adaptiven Gruppe, und genau diese Doppelbelegung war der
    // Grund, den Zeigepunkt `zeiger` zu nennen.)
    for (const [wo, w] of [["Das Pult", pult], ["Der Saal", halle]]) {
      const f = +(await w.ev(FASSUNG));
      if (f < NOETIG) {
        klagen.push("0. " + wo + " meldet pruef.fassung " + f + " statt "
                    + NOETIG + " -- ein Deck von gestern, das den Zeigepunkt"
                    + " noch nicht über die Prüfoberfläche zeigt");
      }
    }
    const buehne = async (w) => JSON.parse(await w.ev(BUEHNE));
    // Auf eine Folie, nicht auf einen festen Schritt: eine Titelfolie steht
    // davor, und ein verdrahteter Index misst am Ende die falsche.
    const aufFolie = (f) => pult.ev(`(function(){
      for (var n = 0; n < 400 && n < typstage.steps.length; n++) {
        if (typstage.steps[n].slide === ${f}) { typstage.goto(n, true); return n; }
      } return -1; })()`);
    const zeigerAn = () => pult.ev(
      `document.querySelector('.ts-sp-wz[data-wz="zeiger"]').click()`);
    const stiftAn = () => pult.ev(
      `document.querySelector('.ts-sp-wz[data-wz="stift"]').click()`);

    // Welche Folie trägt den Rahmen, welche nicht. Gesucht und nicht gezählt.
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
      return JSON.stringify({ mit: mit, ohne: ohne, viele: viele });
    })()`));
    if (folien.mit < 0 || folien.ohne < 0) {
      klagen.push("0. im Probedeck fehlt eine Text- oder eine Rahmenfolie --"
                  + " die Probe misst dann nichts");
    }

    // ── 1 und 2: schweben, ankommen, Größe ────────────────────────────────
    await aufFolie(folien.ohne); await schlaf(700);
    await zeigerAn(); await schlaf(200);
    const bp = await buehne(pult);
    const px = (fx, fy) => [bp[0] + bp[2] * fx, bp[1] + bp[3] * fy];
    await schweb(pult, ...px(0.30, 0.70));
    await schlaf(400);
    let p = await lies(pult), s = await lies(halle);
    if (!p.ebene || !p.an) {
      klagen.push("1. am Pult erschien beim Schweben kein Punkt");
    }
    if (!s.ebene || !s.an) {
      klagen.push("1. im Saal erschien beim Schweben kein Punkt -- genau das"
                  + " war die Meldung");
    } else if (Math.abs(s.x - 0.30) > 0.001 || Math.abs(s.y - 0.70) > 0.001) {
      // 0,001 und nicht 0,005: Chrome trifft hier gemessen 0,3/0,7 genau.
      // Mit 0,005 blieb ein Punkt gruen, der in BEIDEN Fenstern um 0,45 % der
      // Buehne versetzt stand (7,2 px im Saal) -- der Vergleich Pult gegen
      // Saal sieht einen Versatz nicht, den beide teilen.
      klagen.push("1. der Saal setzte den Punkt auf " + s.x + "/" + s.y
                  + " statt 0.30/0.70");
    }
    if (p.ebene && s.ebene
        && (Math.abs(s.x - p.x) > 0.001 || Math.abs(s.y - p.y) > 0.001)) {
      klagen.push("1. Pult " + p.x + "/" + p.y + " gegen Saal " + s.x + "/" + s.y
                  + " -- dieselbe Geste, zwei Stellen (Bühnen " + p.buehne
                  + " gegen " + s.buehne + " px)");
    }
    for (const [wo, w] of [["Pult", p], ["Saal", s]]) {
      if (w.ebene && Math.abs(w.anteil - 2.2) > 0.15) {
        klagen.push("2. im " + wo + " maß der Punkt " + w.anteil + " % der Bühne"
                    + " statt 2,2 % (" + w.px + " px auf " + w.buehne + " px)");
      }
    }
    // Und die Vorgabefarbe. Bis hierher wurde `farbe` nur MITGESCHRIEBEN:
    // mit der Zeile, die den Deckakzent auf `--ts-zeiger` setzt,
    // herausgenommen las die Probe eine leere Zeichenkette, schrieb
    // „· Farbe " ohne Wert und meldete „in Ordnung". Der Akzent kommt aus
    // `#ts-cfg`, also von dort, wo die Laufzeit ihn selbst herholt -- eine
    // Zahl in der Probe wäre bei einem Probedeck mit anderem Thema falsch.
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
    // Die Zahlen mitschreiben, nicht nur bewerten -- dieselbe Zeile schreibt
    // `pruefe-zeiger-ff.js`, damit sich die zwei Browser nebeneinander lesen
    // lassen statt nur „in Ordnung" zu sagen.
    if (p.ebene && s.ebene) {
      process.stderr.write("Chrome: Pult " + p.x + "/" + p.y + " auf "
        + p.buehne + " px (" + p.px + " px, " + p.anteil + " %) · Saal "
        + s.x + "/" + s.y + " auf " + s.buehne + " px (" + s.px + " px, "
        + s.anteil + " %) · Farbe " + s.farbe + "\n");
    }

    // ── 11: die Drossel ───────────────────────────────────────────────────
    //
    // Gezählt wird, was das Pult auf die Leitung legt: `postMessage` wird
    // dafür kurz umgehängt.
    //
    // Vierzig Bewegungen in EINEM Ablauf -- also ohne ein Bild dazwischen --
    // ergeben genau eine Nachricht mit genau einem Punkt. Sie müssen aus der
    // Seite selbst kommen: ein `Input.dispatchMouseEvent` über das Protokoll
    // wird einzeln abgewartet, und zwischen zwei abgewarteten Rufen liegt
    // immer ein Bild. Gemessen wäre das 40 Nachrichten, und die Drossel sähe
    // dabei aus wie abwesend, obwohl sie tut, was sie soll.
    const drosselHilfe = `window.__gezaehlt = [];
      (function(){ var o = window.opener; if (!o) return;
        var alt = o.postMessage.bind(o);
        o.postMessage = function (m, t) {
          if (m && m.kanal === 'zeiger') window.__gezaehlt.push(m.punkte.length);
          return alt(m, t); }; })(); 1`;
    await pult.ev(drosselHilfe);
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
    await schlaf(500);
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
    // Und es ist der LETZTE. Bis hierher wurde nur gezählt: eine Drossel,
    // die den ersten Punkt eines Bildes hält statt des letzten, gab
    // ebenfalls genau eine Nachricht mit genau einem Punkt -- und im Saal
    // stand der Punkt bei 0,215, während die Hand bei 0,8 war.
    s = await lies(halle);
    if (!s.an || Math.abs(s.x - 0.8) > 0.001 || Math.abs(s.y - 0.5) > 0.001) {
      klagen.push("11. nach dem Stoß stand der Punkt im Saal bei " + s.x + "/"
                  + s.y + " statt bei der letzten Stelle 0.8/0.5 -- die Drossel"
                  + " hält nicht den letzten Punkt");
    }
    // Und über die Zeit: jede Nachricht trägt genau einen Punkt. Ohne die
    // Drossel sammelte `strom` je Bündel gemessen 4 bis 9, von denen nur der
    // letzte etwas bewegt.
    await pult.ev(`window.__gezaehlt = []`);
    const a = px(0.20, 0.30), z = px(0.80, 0.60);
    for (let i = 1; i <= 40; i++) {
      await schweb(pult, a[0] + (z[0] - a[0]) * i / 40, a[1] + (z[1] - a[1]) * i / 40);
    }
    await schlaf(500);
    const gez = JSON.parse(await pult.ev(`JSON.stringify(window.__gezaehlt)`));
    if (!gez.length) klagen.push("11. gar nichts ging auf die Leitung");
    else if (Math.max(...gez) > 1) {
      klagen.push("11. eine Nachricht trug " + Math.max(...gez) + " Punkte --"
                  + " gebündelt statt gedrosselt (" + JSON.stringify(gez) + ")");
    }

    // ── 3: die Bühne verlassen ────────────────────────────────────────────
    await schweb(pult, bp[0] + bp[2] + 40, bp[1] + bp[3] / 2);
    await schlaf(500);
    p = await lies(pult); s = await lies(halle);
    if (p.an || p.deckkraft > 0.02) {
      klagen.push("3. am Pult blieb der Punkt stehen, nachdem die Bühne"
                  + " verlassen war (an=" + p.an + ", Deckkraft " + p.deckkraft + ")");
    }
    if (s.an || s.deckkraft > 0.02) {
      klagen.push("3. im Saal blieb der Punkt stehen, nachdem die Bühne"
                  + " verlassen war (an=" + s.an + ", Deckkraft " + s.deckkraft + ")");
    }
    // Und dasselbe bei gehaltener Taste. Wer mitten im Strich mit `m` zum
    // Zeiger wechselt und dann hinauszieht, hat den Zeiger noch gefangen --
    // der Stift hat ihn mit `setPointerCapture` genommen, und `modusSetzen`
    // gibt ihn nicht zurück. Solange der Fang hält, kommt `pointerleave`
    // nicht; die Bühne bekommt die Bewegung weiter, und nur der Blick auf die
    // Stelle im Schwebezweig (`if (!drin(pm)) { hinAus(); ... }`) nimmt den
    // Punkt. Gemessen, bevor dieser Teil hier stand: mit genau dieser Zeile
    // herausgenommen blieben BEIDE Proben grün, und der Punkt stand im Saal
    // auf der letzten Stelle innerhalb der Bühne, bis die Taste losging.
    await stiftAn(); await schlaf(300);
    const g0 = px(0.40, 0.50), g1 = px(0.60, 0.50), g2 = px(0.80, 0.50);
    const gDraussen = [bp[0] + bp[2] + 60, g2[1]];
    await schweb(pult, ...g0);
    await maus(pult, "mousePressed", ...g0);
    await maus(pult, "mouseMoved", ...g1); await schlaf(300);
    await pult.taste("m"); await schlaf(300);
    await maus(pult, "mouseMoved", ...g2); await schlaf(500);
    s = await lies(halle);
    if (!s.an) {
      klagen.push("3. mit gehaltener Taste stand nach dem Wechsel zum Zeiger"
                  + " gar kein Punkt -- dann sagt das Folgende nichts");
    } else {
      await maus(pult, "mouseMoved", ...gDraussen); await schlaf(600);
      s = await lies(halle);
      if (s.an) {
        klagen.push("3. mit gehaltener Taste aus der Bühne gezogen, blieb der"
                    + " Punkt im Saal bei " + s.x + "/" + s.y + " stehen --"
                    + " der Fang hält `pointerleave` zurück, und die Stelle"
                    + " wurde nicht geprüft");
      }
    }
    await maus(pult, "mouseReleased", ...gDraussen); await schlaf(400);
    // Der halbe Strich von eben muss weg, sonst zählte Punkt 4 ihn mit.
    await pult.taste("x"); await schlaf(400);
    if (+(await halle.ev(STRICHE)) > 0) {
      klagen.push("3. der Strich vor dem Wechsel ging mit `x` nicht weg --"
                  + " Punkt 4 zählte sonst einen fremden Strich mit");
    }

    // ── 4 und 5: Stift, Strich, Reihenfolge im Baum ───────────────────────
    await stiftAn(); await schlaf(300);
    const m = px(0.25, 0.45);
    await maus(pult, "mousePressed", m[0], m[1]);
    for (let i = 1; i <= 10; i++) await maus(pult, "mouseMoved", m[0] + i * 14, m[1]);
    await maus(pult, "mouseReleased", m[0] + 140, m[1]);
    await schlaf(700);
    if (+(await halle.ev(STRICHE)) < 1) {
      klagen.push("4. ein Zug im Stiftmodus erzeugte im Saal keinen Strich");
    }
    s = await lies(halle);
    if (s.an) klagen.push("4. im Stiftmodus stand trotzdem ein Punkt");
    await zeigerAn(); await schlaf(200);
    await schweb(pult, m[0] + 70, m[1]);
    await schlaf(400);
    const lage = await halle.ev(`(function(){
      var i = document.getElementById('ts-ink'), p = document.getElementById('ts-punkt');
      if (!i || !p) return "fehlt";
      var z = [getComputedStyle(i).zIndex, getComputedStyle(p).zIndex].join("/");
      return z + " " + ((i.compareDocumentPosition(p) & 4) ? "dahinter" : "davor")
        + (i.parentNode === p.parentNode ? "" : " fremd");
    })()`);
    // Die Reihenfolge im Baum entscheidet nur bei GLEICHER z-Stufe. Bis
    // hierher wurden die Stufen nur mitgeschrieben: mit `#ts-punkt` auf
    // z-index 5 lag der Punkt unter jedem Strich, und die Probe sagte
    // „dahinter" und „in Ordnung".
    const zs = String(lage).split(" ")[0].split("/").map(Number);
    if (!/dahinter/.test(lage) || / fremd/.test(lage) || !(zs[1] >= zs[0])) {
      klagen.push("5. die Punktebene liegt nicht über #ts-ink ("
                  + lage + ") -- ein Strich verdeckte den Punkt");
    }
    await pult.taste("x"); await schlaf(400);   // Tinte weg

    // ── 6: die Rahmenfolie ────────────────────────────────────────────────
    await aufFolie(folien.mit); await schlaf(900);
    await zeigerAn(); await schlaf(200);
    const knopf = JSON.parse(await pult.ev(`(function(){
      var f = document.querySelector('.ts-el iframe');
      var r = f.getBoundingClientRect();
      var kn = f.contentDocument.getElementById('knopf').getBoundingClientRect();
      var sk = parseFloat(f.dataset.skala) || parseFloat(f.style.zoom) || 1;
      return JSON.stringify({ x: r.left + (kn.left + kn.width / 2) * sk,
                              y: r.top + (kn.top + kn.height / 2) * sk });
    })()`));
    await pult.ev(LEER); await halle.ev(LEER);
    await schweb(pult, knopf.x, knopf.y);
    await schlaf(400);
    const beimSchweben = await halle.ev(LOG);
    if (!/^0\//.test(beimSchweben)) {
      klagen.push("6. das bloße Schweben schickte schon etwas in den Rahmen ("
                  + beimSchweben + ") -- ein Zeigen ist kein Bedienen");
    }
    s = await lies(halle);
    if (!s.an) klagen.push("6. über dem Rahmen stand kein Punkt");
    await maus(pult, "mousePressed", knopf.x, knopf.y);
    await schlaf(150);
    await maus(pult, "mouseReleased", knopf.x, knopf.y);
    await schlaf(700);
    const saalLog = await halle.ev(LOG), pultLog = await pult.ev(LOG);
    for (const [wo, l] of [["Saal", saalLog], ["Pult", pultLog]]) {
      const teil = String(l).split("/");
      if (+teil[1] !== 1) {
        klagen.push("6. im " + wo + " zählte der Knopf " + teil[1] + " statt 1"
                    + " -- der Punkt hat den Rahmenweg gekostet (" + l + ")");
      }
    }

    // Und der Zug und das Rad. Ein Klick ist nur ein Drittel dessen, was es
    // vorher schon gab: gedrückt gezogen geht jede Bewegung an den Knopf, der
    // den Druck genommen hat (`ZIEL_FERN`), auch wenn die Hand ihn verlässt,
    // und das Rad geht in den Rahmen darunter. Bis hierher klickte die Probe
    // nur -- mit dem Zug oder dem Rad aus der Laufzeit genommen blieb sie grün.
    const rahmen = JSON.parse(await pult.ev(`(function(){
      var q = document.querySelector('.ts-el iframe').getBoundingClientRect();
      return JSON.stringify([q.left, q.top, q.width, q.height]); })()`));
    const imRahmen = (fx, fy) => [rahmen[0] + rahmen[2] * fx, rahmen[1] + rahmen[3] * fy];
    await pult.ev(LEER); await halle.ev(LEER);
    await maus(pult, "mousePressed", knopf.x, knopf.y); await schlaf(150);
    for (const [fx, fy] of [[0.45, 0.45], [0.55, 0.55], [0.65, 0.65]]) {
      await maus(pult, "mouseMoved", ...imRahmen(fx, fy)); await schlaf(120);
    }
    await maus(pult, "mouseReleased", ...imRahmen(0.65, 0.65)); await schlaf(700);
    await pult.ruf("Input.dispatchMouseEvent", { type: "mouseWheel",
      x: knopf.x, y: knopf.y, deltaX: 0, deltaY: 120, pointerType: "mouse" });
    await schlaf(700);
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
    await pult.taste("b"); await schlaf(500);
    await schweb(pult, knopf.x + 30, knopf.y + 30);
    await schlaf(400);
    s = await lies(halle);
    if (s.deckkraft > 0.02) {
      klagen.push("7. unter `b` blieb der Punkt im Saal sichtbar (Deckkraft "
                  + s.deckkraft + ")");
    }
    await pult.taste("b"); await schlaf(500);

    // ── 8: eingefroren ────────────────────────────────────────────────────
    //
    // Der Saal steht auf einer anderen Folie als das Pult. Ein Punkt darauf
    // zeigte auf die falsche Stelle, und ein Klick landete in einem Rahmen,
    // den niemand sieht.
    //
    // Zuerst der Punkt, der beim Einfrieren SCHON steht. Die Hand bleibt
    // dabei liegen -- nur die Taste. Gemessen war das der Unterschied: die
    // Schranke im Saal fing, was waehrend des Frosts ankam, aber den
    // stehenden Punkt nahm sie nicht mit, und er blieb, bis der Sprecher die
    // Maus wieder bewegte.
    await halle.ev(LEER);
    await aufFolie(folien.ohne); await schlaf(800);
    await zeigerAn(); await schlaf(200);
    await schweb(pult, ...px(0.35, 0.35)); await schlaf(500);
    s = await lies(halle);
    if (!s.an) {
      klagen.push("8. vor dem Einfrieren stand im Saal gar kein Punkt --"
                  + " dann sagt das Folgende nichts");
    }
    await pult.taste("e"); await schlaf(700);
    s = await lies(halle);
    if (s.an) {
      klagen.push("8. das Einfrieren ließ den schon stehenden Punkt im Saal"
                  + " bei " + s.x + "/" + s.y + " stehen -- er ging erst weg,"
                  + " als die Hand sich wieder bewegte");
    }
    // Und er bleibt auch weg, wenn das Pult danach weiterblättert: der Saal
    // steht dann auf einer anderen Folie als das Pult.
    await pult.taste("ArrowRight"); await schlaf(350);
    await pult.taste("ArrowRight"); await schlaf(600);
    s = await lies(halle);
    if (s.an) {
      klagen.push("8. eingefroren stand im Saal weiter ein Punkt, während das"
                  + " Pult zwei Folien weiter war -- er zeigte auf eine"
                  + " Folie, die niemand mehr meint");
    }
    await aufFolie(folien.ohne); await schlaf(800);
    await schweb(pult, ...px(0.40, 0.40));
    await schlaf(400);
    await maus(pult, "mousePressed", ...px(0.40, 0.40));
    await schlaf(120);
    await maus(pult, "mouseReleased", ...px(0.40, 0.40));
    await schlaf(500);
    s = await lies(halle);
    if (s.an) klagen.push("8. eingefroren nahm der Saal trotzdem einen Punkt an");
    const frostLog = await halle.ev(LOG);
    if (!/^0\//.test(String(frostLog).split(" ")[0]) && frostLog !== "(kein Rahmen)") {
      klagen.push("8. eingefroren kam trotzdem etwas im Rahmen des Saals an ("
                  + frostLog + ")");
    }
    await pult.taste("e"); await schlaf(800);

    // ── 9: der Finger ─────────────────────────────────────────────────────
    await aufFolie(folien.ohne); await schlaf(700);
    await zeigerAn(); await schlaf(200);
    const f1 = px(0.20, 0.30), f2 = px(0.60, 0.60);
    await finger(pult, "touchStart", f1[0], f1[1]); await schlaf(150);
    await finger(pult, "touchMove", f2[0], f2[1]); await schlaf(400);
    s = await lies(halle);
    if (!s.an) klagen.push("9. ein gehaltener Finger setzte keinen Punkt");
    await finger(pult, "touchEnd", f2[0], f2[1]); await schlaf(600);
    s = await lies(halle);
    if (s.an) {
      klagen.push("9. der Punkt blieb hängen, nachdem der Finger gehoben war");
    }

    // ── 10: Schritt hält, Folie nimmt ─────────────────────────────────────
    if (folien.viele >= 0) {
      await aufFolie(folien.viele); await schlaf(700);
      await zeigerAn(); await schlaf(200);
      await schweb(pult, ...px(0.50, 0.50)); await schlaf(400);
      const vorher = JSON.parse(await pult.ev(`JSON.stringify(typstage.pruef.stand())`));
      await pult.taste("ArrowRight"); await schlaf(900);
      const nachher = JSON.parse(await pult.ev(`JSON.stringify(typstage.pruef.stand())`));
      s = await lies(halle);
      if (nachher.folie === vorher.folie) {
        if (!s.an) {
          klagen.push("10. ein Schrittwechsel auf derselben Folie nahm den Punkt"
                      + " -- wer die nächste Zeile aufdeckt, meint weiter"
                      + " denselben Begriff");
        }
      } else {
        klagen.push("10. der Pfeil sprang gleich auf die nächste Folie --"
                    + " die Probe misst den Schrittwechsel dann nicht");
      }
      // Und nun über die Folie hinaus.
      for (let i = 0; i < 4; i++) {
        await pult.taste("ArrowRight"); await schlaf(250);
      }
      await schlaf(800);
      const weit = JSON.parse(await pult.ev(`JSON.stringify(typstage.pruef.stand())`));
      s = await lies(halle);
      // Erst laut, wenn dieser Teil gar nicht laufen KANN. Eine stille
      // Bedingung, die nie wahr wird, ist schlimmer als eine fehlende
      // Pruefung: sie steht in der Liste, als waere sie gemessen. Gemessen
      // war sie es nicht -- die mehrschrittige Folie war die letzte des
      // Probedecks, der Pfeil lief gegen den Anschlag, und `weit.folie` blieb
      // `vorher.folie`.
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

    // ── 14: das Fenster verliert den Fokus ────────────────────────────────
    //
    // Der dritte der vier Anlässe des Handbuchs. Die Hand bleibt dabei
    // LIEGEN: ein Punkt, der erst bei der nächsten Bewegung verschwindet,
    // steht so lange im Saal, während das Pult längst in einem anderen
    // Programm ist.
    //
    // Selbst abgeschicktes `blur` und nicht ein echter Fensterwechsel, und
    // das ist gemessen und nicht bequem: in diesem Chrome (`--headless=new`)
    // ist JEDE Seite fokussiert und sichtbar. `Page.bringToFront` auf den
    // Saal, `Emulation.setFocusEmulationEnabled: false` und ein drittes Ziel
    // mit `Target.activateTarget` ließen `document.hasFocus()` am Pult alle
    // drei auf `true` -- kein Weg über das Protokoll nimmt den Fokus. Was
    // hier gemessen wird, ist damit die Verdrahtung und nicht der
    // Fensterwechsel des Fenstersystems; genau sie fällt weg, wenn jemand den
    // Haken entkernt. Die Firefox-Probe daneben kann den echten Wechsel
    // (`browsingContext.activate`) und misst ihn dort.
    await aufFolie(folien.ohne); await schlaf(700);
    await zeigerAn(); await schlaf(200);
    await schweb(pult, ...px(0.45, 0.55)); await schlaf(500);
    s = await lies(halle);
    if (!s.an) {
      klagen.push("14. vor dem Fokusverlust stand im Saal gar kein Punkt --"
                  + " dann sagt das Folgende nichts");
    }
    await pult.ev(`window.dispatchEvent(new FocusEvent("blur")); 1`);
    await schlaf(600);
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

    // ── 15: der Griff zum Stift, bei liegender Hand ───────────────────────
    //
    // Der vierte Anlass. Punkt 4 misst ihn NICHT: dort ist die Hand vorher
    // von der Bühne gefahren, der Punkt also schon aus, und die Zeile in
    // `modusSetzen` läuft ins Leere. Gemessen: mit ihr herausgenommen blieb
    // Punkt 4 grün, und der Punkt stand im Saal weiter.
    //
    // Beide Wege, Knopf und Taste: sie gehen zwar beide durch `modusSetzen`,
    // aber genau diese Behauptung ist schon einmal falsch gewesen (der alte
    // Hinweis hing an der Taste, und der Knopf daneben schwieg).
    // Zwei verschiedene Stellen, und das ist kein Schmuck: eine Bewegung auf
    // dieselbe Stelle ist keine Bewegung, und der zweite Durchgang faende
    // dann gar keinen Punkt vor. Gemessen in Firefox, wo
    // `input.performActions` einen Zug auf den alten Ort verschluckt.
    const stellen = [[0.38, 0.62], [0.42, 0.58]];
    let nr = 0;
    for (const [wie, greifen] of [["über den Knopf", () => stiftAn()],
                                  ["mit der Taste `m`", () => pult.taste("m")]]) {
      await zeigerAn(); await schlaf(250);
      await schweb(pult, ...px(...stellen[nr++])); await schlaf(500);
      s = await lies(halle);
      if (!s.an) {
        klagen.push("15. vor dem Griff zum Stift (" + wie + ") stand im Saal"
                    + " gar kein Punkt -- dann sagt das Folgende nichts");
        continue;
      }
      await greifen(); await schlaf(600);
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
    await pult.ende(); await halle.ende();
  }

  // ═══ 13: der spiegelnde Rahmen ════════════════════════════════════════════
  //
  // Zwei Fragen in einer Bewegung: nimmt der Eintritt den Punkt, und bleibt
  // der Rahmen dabei bedienbar? Beides muss halten -- ein Punkt, der stehen
  // bleibt, zeigt auf eine Stelle, auf die niemand mehr zeigt; ein Rahmen,
  // der nicht mehr anspricht, kostet den Grund, warum er die Maus bekommt.
  {
    const { halle, pult } = await zweiFenster(spiegelDeck, 1600, 900, 1120, 760);
    const lies = async (w) => JSON.parse(await w.ev(PUNKT));
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
      await schlaf(1200);
      await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="zeiger"]').click()`);
      await schlaf(300);
      const bp = JSON.parse(await pult.ev(
        `(function(){var b=document.getElementById('ts-stage').getBoundingClientRect();
          return JSON.stringify([b.left,b.top,b.width,b.height]);})()`));
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
      // Neben den Rahmen: der Punkt steht.
      await schweb(pult, bp[0] + bp[2] * 0.5, bp[1] + bp[3] * 0.08);
      await schlaf(600);
      const neben = await lies(halle);
      if (!neben.an) {
        klagen.push("13. neben dem spiegelnden Rahmen stand schon kein Punkt --"
                    + " dann sagt das Folgende nichts");
      }
      // Und hinein.
      await schweb(pult, r.mx, r.my);
      await schlaf(900);
      const drin = await lies(halle);
      if (drin.an) {
        klagen.push("13. über dem spiegelnden Rahmen blieb der Punkt im Saal"
                    + " bei " + drin.x + "/" + drin.y + " stehen, während die"
                    + " Hand im Rahmen arbeitete -- er zeigte auf eine Stelle,"
                    + " auf die niemand mehr zeigt");
      }
      // Bedienbar bleibt er trotzdem: der Sprecher arbeitet auf dem Rahmen
      // vor sich, und genau dafür hat er die Maus.
      await pult.ev(LEER);
      await maus(pult, "mousePressed", r.kx, r.ky);
      await schlaf(150);
      await maus(pult, "mouseReleased", r.kx, r.ky);
      await schlaf(700);
      const log = String(await pult.ev(LOG)).split("/");
      if (+log[1] !== 1) {
        klagen.push("13. im spiegelnden Rahmen zählte der Knopf am Pult "
                    + log[1] + " statt 1 -- der Eingriff hat den Rahmenweg"
                    + " gekostet (" + log.join("/") + ")");
      }
    }
    await pult.ende(); await halle.ende();
  }

  // ═══ 17: das Pult geht zu ═════════════════════════════════════════════════
  //
  // Der Punkt hängt an einer Hand, und die Hand hängt am Pult. Wird das Pult
  // geschlossen, während im Saal ein Punkt steht, kommt kein `weg` mehr
  // hinüber -- es gibt niemanden mehr, der es schicken könnte. Bemerken kann
  // das nur der Saal selbst: seine Wache schlägt einmal je Sekunde
  // (`wacheAn`), findet keinen `partner()` mehr und ruft `sichtLoesen()`, und
  // das nimmt den Punkt. Drei Zeilen tragen das -- `wacheAn()` im Horcher
  // `zeiger`, `!PUNKT_AN` in der Bedingung, unter der die Wache sich
  // abstellt, und `punktWeg()` in `sichtLoesen` --, und bevor es diesen Punkt
  // gab, ließ jede einzelne herausgenommen BEIDE Proben grün.
  //
  // Geschlossen wird wie von Hand: das Pult schließt sich selbst, die Probe
  // spricht danach nicht mehr mit ihm (eine Sitzung auf eine geschlossene
  // Seite gibt keine Antwort mehr). Dass es wirklich zu ist, sagt die Zahl
  // der Seiten im Browser -- sonst hieße eine Klage hier womöglich nur, dass
  // das Schließen nicht geklappt hat. Frist sechs Sekunden: ein Vielfaches
  // des Wachtakts und weit unter allem, was im Saal auffiele.
  {
    const { halle, pult } = await zweiFenster(mitPunkt, 1600, 900, 1120, 760);
    const seiten = async () => ((await halle.ruf("Target.getTargets", {}))
      .result.targetInfos || []).filter(t => t.type === "page").length;
    const bp = JSON.parse(await pult.ev(BUEHNE));
    await pult.ev(`(function(){
      for (var n = 0; n < typstage.steps.length; n++) {
        if (typstage.steps[n].slide === 1) { typstage.goto(n, true); return n; }
      } return -1; })()`);
    await schlaf(700);
    await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="zeiger"]').click()`);
    await schlaf(250);
    await schweb(pult, bp[0] + bp[2] * 0.25, bp[1] + bp[3] * 0.75);
    await schlaf(600);
    let s = JSON.parse(await halle.ev(PUNKT));
    // Erst das Neuladen. Die Hand ist danach ebenso fort wie nach dem
    // Schließen, aber die Wache sieht einen lebendigen Partner -- gemessen
    // stand der Punkt im Saal nach 70 s noch auf 0,25/0,75. Erst der Gruß des
    // frisch geladenen Pults (`hallo` mit `frisch`) nimmt ihn.
    if (!s.an) {
      klagen.push("17. vor dem Neuladen des Pults stand im Saal gar kein"
                  + " Punkt -- dann sagt das Folgende nichts");
    } else {
      await pult.ev(`setTimeout(function () { location.reload(); }, 50); 1`);
      const t1 = Date.now();
      while (Date.now() - t1 < 6000) {
        await schlaf(250);
        s = JSON.parse(await halle.ev(PUNKT));
        if (!s.an) break;
      }
      if (s.an) {
        klagen.push("17. im Saal stand der Punkt sechs Sekunden nach dem"
                    + " Neuladen des Pults noch bei " + s.x + "/" + s.y
                    + " -- er zeigte für eine Hand, die es nicht mehr gibt");
      }
      await schlaf(2500);
      await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="zeiger"]').click()`);
      await schlaf(250);
      const bq = JSON.parse(await pult.ev(BUEHNE));
      await schweb(pult, bq[0] + bq[2] * 0.3, bq[1] + bq[3] * 0.7);
      await schlaf(600);
      s = JSON.parse(await halle.ev(PUNKT));
    }
    const vorher = await seiten();
    if (!s.an) {
      klagen.push("17. vor dem Schließen des Pults stand im Saal gar kein"
                  + " Punkt -- dann sagt das Folgende nichts");
    } else {
      await pult.ev(`setTimeout(function () { window.close(); }, 50); 1`);
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        await schlaf(250);
        s = JSON.parse(await halle.ev(PUNKT));
        if (!s.an) break;
      }
      const nachher = await seiten();
      if (nachher !== vorher - 1) {
        klagen.push("17. das Pult ging nicht zu (" + vorher + " Seiten vorher, "
                    + nachher + " nachher) -- dann misst dieser Punkt nichts");
      } else if (s.an) {
        klagen.push("17. im Saal stand der Punkt sechs Sekunden nach dem"
                    + " Schließen des Pults noch bei " + s.x + "/" + s.y
                    + " -- er zeigte für eine Hand, die es nicht mehr gibt");
      }
    }
    await pult.ende(); await halle.ende();
  }

  // ═══ 16: Farbe und Gestalt, gemessen im BILD des Saals ════════════════════
  //
  // Bis hierher las jede Probe die Farbe nur aus der Oberfläche und verglich
  // sie mit nichts: mit der Zeile, die den Deckakzent auf `--ts-zeiger` legt,
  // herausgenommen stand in der Mitschrift „· Farbe " ohne Wert, der Punkt
  // trug das Orange des Stilblatts statt der Farbe des Decks -- und beide
  // Proben meldeten „in Ordnung".
  //
  // Hier wird das Bild gefragt. Verfahren, einmal und für beide Browser (es
  // steht in `decklauf/zeigerdeck.js` als `ringMessen`):
  //
  //   Saalfenster 1600x900, Punkt auf 0,5/0,5, Bildschirmfoto unskaliert.
  //   Mitte und Radius aus `pruef.zeiger()`. Grund = häufigste Farbe auf dem
  //   Kreis mit 2,5 Radien (32 Richtungen), Kern auf 0,25, heller Ring auf
  //   0,57 und dunkler Ring auf 0,71 Radien (je 16 Richtungen). Kontrast
  //   zwischen Ring und Grund nach WCAG 2.1.
  //
  // Zwei Gründe, weil die Zusage zwei hat: auf heller Folie verschwindet der
  // helle Ring im Papier und der dunkle trägt den Kontrast, auf
  // `themes.night` umgekehrt. Dieselben zwei Zahlen stehen im CHANGELOG, in
  // beiden Handbüchern und im Kommentar der Laufzeit -- hier laufen sie ab,
  // statt geglaubt zu werden.
  for (const ring of RINGE) {
    const { halle, pult } = await zweiFenster(grundDecks[ring.deck],
                                              1600, 900, 1120, 760);
    const bp = JSON.parse(await pult.ev(BUEHNE));
    await pult.ev(`(function(){
      for (var n = 0; n < typstage.steps.length; n++) {
        if (typstage.steps[n].slide === 1) { typstage.goto(n, true); return n; }
      } return -1; })()`);
    await schlaf(700);
    await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="zeiger"]').click()`);
    await schlaf(250);
    await schweb(pult, bp[0] + bp[2] * 0.5, bp[1] + bp[3] * 0.5);
    await schlaf(700);
    const z = JSON.parse(await halle.ev(PUNKT));
    const akzent = String(await halle.ev(AKZENT) || "");
    if (!z.ebene || !z.an) {
      klagen.push("16. auf `themes." + ring.thema + "` stand im Saal kein"
                  + " Punkt -- dann ist weder Farbe noch Gestalt zu messen");
      await pult.ende(); await halle.ende();
      continue;
    }
    const sr = JSON.parse(await halle.ev(BUEHNE));
    const g = ringMessen(await halle.bild(), sr, z);
    process.stderr.write("Chrome/" + ring.thema + ": Grund "
      + g.grund.farbe.join(",") + " · Kern " + g.kern.farbe.join(",")
      + " (Akzent " + akzent + ", Kontrast " + g.kKern + ") · heller Ring "
      + g.hell.farbe.join(",") + " K=" + g.kHell + " · dunkler Ring "
      + g.dunkel.farbe.join(",") + " K=" + g.kDunkel + " · Kern reicht "
      + g.weite.achsen + " px gerade und " + g.weite.schraeg
      + " px schräg von r=" + g.r + "\n");

    // Die Farbe: der Kern IM BILD trägt den Akzent des Decks.
    if (!nahe(g.kern.farbe, farbeZahlen(akzent), 6)) {
      klagen.push("16. auf `themes." + ring.thema + "` misst der Kern im"
                  + " Saalbild " + g.kern.farbe.join(",") + " statt des"
                  + " Deckakzents " + akzent + " -- der Punkt trägt die"
                  + " Vorgabefarbe nicht");
    }
    // Die Gestalt: zwei Ringe, einer heller und einer dunkler als der Kern.
    const hell = g.hell.farbe, dunkel = g.dunkel.farbe;
    const summe = (c) => c[0] + c[1] + c[2];
    if (summe(hell) <= summe(dunkel)) {
      klagen.push("16. auf `themes." + ring.thema + "` liegt um den Kern kein"
                  + " Paar aus hellem und dunklem Ring (innen "
                  + hell.join(",") + ", außen " + dunkel.join(",") + ") --"
                  + " genau dieses Paar trägt den Kontrast, gleich welche"
                  + " Farbe der Kern hat");
    }
    // Und der, der auf DIESEM Grund trägt, trägt die Zahl, die in der Doku
    // steht. Eine Probe, die nur „irgendein Ring ist da" sagt, ließe die
    // Zahl wieder wegdriften.
    const ist = ring.welcher === "hell" ? g.kHell : g.kDunkel;
    if (Math.abs(ist - ring.soll) > 0.15) {
      klagen.push("16. " + ring.wort + " " + ist + " statt " + ring.soll
                  + " (Grund " + g.grund.farbe.join(",") + ") -- dieselbe Zahl"
                  + " steht im CHANGELOG, in beiden Handbüchern und im"
                  + " Kommentar der Laufzeit");
    }
    // Rund und nicht eckig: ein Kreis reicht gerade so weit wie schräg, ein
    // Quadrat schräg um Wurzel zwei weiter. Und der Kern hört bei der Hälfte
    // des Radius auf -- darüber beginnen die Ringe.
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

  // ═══ Gestellt: eigene Farbe, eigene Größe ═════════════════════════════════
  {
    const { halle, pult } = await zweiFenster(gestellt, 1600, 900, 1120, 760);
    const bp = JSON.parse(await pult.ev(
      `(function(){var b=document.getElementById('ts-stage').getBoundingClientRect();
        return JSON.stringify([b.left,b.top,b.width,b.height]);})()`));
    await pult.ev(`typstage.goto(1, true)`); await schlaf(700);
    await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="zeiger"]').click()`);
    await schlaf(200);
    await schweb(pult, bp[0] + bp[2] * 0.5, bp[1] + bp[3] * 0.5);
    await schlaf(500);
    const s = JSON.parse(await halle.ev(PUNKT));
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

  // ═══ Abbestellt: keine Ebene, und die alte Meldung wird wahr ══════════════
  {
    const { halle, pult } = await zweiFenster(ohnePunkt, 1600, 900, 1120, 760);
    const bp = JSON.parse(await pult.ev(
      `(function(){var b=document.getElementById('ts-stage').getBoundingClientRect();
        return JSON.stringify([b.left,b.top,b.width,b.height]);})()`));
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

    await aufFolie(folien.ohne); await schlaf(700);
    // Der Knopf.
    await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="stift"]').click()`);
    await schlaf(300);
    await pult.ev(`document.getElementById('ts-hint').textContent = ""`);
    await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="zeiger"]').click()`);
    await schlaf(400);
    const amKnopf = await hinweis();
    if (!amKnopf) {
      klagen.push("12. mit `pointer: false` schwieg der KNOPF auf einer"
                  + " Textfolie -- die Meldung hängt wieder nur an der Taste");
    }
    // Und die Taste.
    await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="stift"]').click()`);
    await schlaf(300);
    await pult.ev(`document.getElementById('ts-hint').textContent = ""`);
    await pult.taste("m"); await schlaf(400);
    const anDerTaste = await hinweis();
    if (!anDerTaste) {
      klagen.push("12. mit `pointer: false` schwieg die TASTE `m` auf einer"
                  + " Textfolie");
    }
    // Auf einer Rahmenfolie gibt es etwas zu zeigen, also schweigt sie.
    await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="stift"]').click()`);
    await aufFolie(folien.mit); await schlaf(900);
    await pult.ev(`document.getElementById('ts-hint').textContent = ""`);
    await pult.ev(`document.querySelector('.ts-sp-wz[data-wz="zeiger"]').click()`);
    await schlaf(400);
    const amRahmen = await hinweis();
    if (amRahmen) {
      klagen.push("12. auf einer Rahmenfolie sagte das Pult trotzdem "
                  + JSON.stringify(amRahmen) + " -- dort gibt es etwas zu zeigen");
    }
    // Und die Ebene entsteht gar nicht erst.
    await aufFolie(folien.ohne); await schlaf(700);
    await schweb(pult, bp[0] + bp[2] * 0.4, bp[1] + bp[3] * 0.4);
    await schlaf(500);
    const sp = JSON.parse(await pult.ev(PUNKT));
    const sa = JSON.parse(await halle.ev(PUNKT));
    if (sp.ebene || sa.ebene) {
      klagen.push("12. mit `pointer: false` entstand trotzdem eine Punktebene"
                  + " (Pult " + sp.ebene + ", Saal " + sa.ebene + ")");
    }
    // Und die Oberfläche sagt WARUM keine da ist. Ohne `aus` sähe ein Lauf
    // den abbestellten Punkt genauso wie einen, der nur noch nie gezeigt hat.
    if (!sp.aus || !sa.aus) {
      klagen.push("12. `pruef.zeiger().aus` meldet Pult " + sp.aus + ", Saal "
                  + sa.aus + " -- mit `room: (pointer: false)` muss beides"
                  + " wahr sein, sonst ist „keine Ebene\" nicht von „noch"
                  + " nie gezeigt\" zu unterscheiden");
    }
    await pult.ende(); await halle.ende();
  }

  if (klagen.length) {
    console.log("Zeiger: " + klagen.length + " Punkt(e)\n");
    klagen.forEach(k => console.log("  • " + k));
    process.exit(1);
  }
  console.log("Zeiger: in Ordnung");
  process.exitCode = 0;
})();
