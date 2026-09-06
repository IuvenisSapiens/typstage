// pruefe-fussnoten.js — blendet eine Anmerkung mit ihrer Marke ein?
//
// Eine Fußnote steht am Fuß ihrer Folie. Steht sie *in* einer Aufdeckkette,
// dann soll ihre Anmerkung erscheinen, wenn ihre Marke erscheint, und nicht
// vorher: sonst verrät der Folienfuß, was der Vortrag noch nicht gezeigt hat.
//
//   node .github/scripts/pruefe-fussnoten.js [--browser /pfad]
//
// Eigens im Browser und nicht auf Papier: die Anmerkung steht im Satz als
// Glyphenpfad, ihr Text ist aus der Ausgabe nicht zu lesen. Ob sie zu sehen
// ist, sagt allein die Deckkraft ihres Elements -- und Elemente baut die
// Laufzeit, nicht der Export. Aus demselben Grund misst der Decklauf so.
//
// Der Prüfling ist ein dreiteiliges `stagger`: die erste Fußnote steht im
// Fluss und gilt ab Schritt eins, die zweite im ersten Teil und ebenso, die
// dritte im letzten Teil und erst ab Schritt drei. Ein Deck mit einer
// einzigen Folie und einer einzigen Fußnote sähe den Unterschied nicht.
const { starte, schlaf } = require("./decklauf/cdp.js");
const { execFileSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");

const WURZEL = path.resolve(__dirname, "..", "..");
const arg = (n, v) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : v; };
const CHROME = arg("--browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");

const DECK = `#import "@preview/typstage:0.1.1": *
#show: presentation.with(theme: themes.lesson, title: [Fußnoten])

== Aufdecken
Grund#footnote[GRUND].

#stagger[eins#footnote[EINS]][zwei][drei#footnote[DREI]]
`;

// Die Anmerkungen als eigene Elemente, mit ihrer Spanne und ihrer Deckkraft.
const anmerkungen = `(function(){
  var e = [].slice.call(document.querySelectorAll('#ts-stage .ts-el.ts-note'));
  return JSON.stringify(e.map(function(x){
    return { at: x.dataset.at, deckkraft: +(+getComputedStyle(x).opacity).toFixed(2) };
  }));
})()`;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "typstage-fn-"));
  const paket = fs.mkdtempSync(path.join(os.tmpdir(), "typstage-fn-pkg-"));
  for (const raum of ["schule", "preview"]) {
    fs.mkdirSync(path.join(paket, raum, "typstage"), { recursive: true });
    fs.symlinkSync(WURZEL, path.join(paket, raum, "typstage", "0.1.1"));
  }
  fs.writeFileSync(path.join(tmp, "deck.typ"), DECK);
  try {
    execFileSync("typst", ["compile", "--format", "html", "--features", "html",
      "--package-path", paket, "--root", tmp,
      path.join(tmp, "deck.typ"), path.join(tmp, "deck.html")],
      { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    const wort = String((e.stderr || "")).split("\n")
      .find(z => z.startsWith("error:")) || "unbekannter Fehler";
    console.log("Fußnoten: das Probedeck übersetzt nicht -- " + wort);
    process.exit(1);
  }

  const b = await starte(CHROME);
  const klagen = [];
  await b.navigiere("file://" + path.join(tmp, "deck.html"));
  await schlaf(2500);
  // Auf die Folie mit den Fußnoten, erster Schritt.
  await b.taste("ArrowRight");
  await schlaf(1200);

  const erste = JSON.parse(await b.ev(anmerkungen));
  if (erste.length !== 3) {
    klagen.push("die Folie trägt drei Fußnoten, aber " + erste.length
      + " Anmerkung(en) mit eigenem Element. Ohne eigenes Element steht eine "
      + "Anmerkung vom ersten Schritt an da und lässt sich nicht einblenden.");
  } else {
    const spannen = erste.map(a => a.at).join(" ");
    if (spannen !== "1- 1- 3-") {
      klagen.push("die Anmerkungen gelten ab " + spannen + " statt ab 1- 1- 3-."
        + " Die dritte Fußnote steht im letzten Teil eines dreiteiligen"
        + " `stagger` und erscheint dort erst auf Schritt drei.");
    }
    if (erste[2].deckkraft > 0.05) {
      klagen.push("die dritte Anmerkung steht schon auf Schritt eins mit"
        + " Deckkraft " + erste[2].deckkraft + ". Ihre Marke ist dort noch"
        + " nicht zu sehen; der Folienfuß verrät damit, was noch kommt.");
    }
  }

  // Bis zum dritten Schritt der Folie.
  await b.taste("ArrowRight"); await schlaf(700);
  await b.taste("ArrowRight"); await schlaf(1200);
  const dritte = JSON.parse(await b.ev(anmerkungen));
  if (dritte.length === 3 && dritte[2].deckkraft < 0.95) {
    klagen.push("die dritte Anmerkung steht auf Schritt drei nur mit Deckkraft "
      + dritte[2].deckkraft + ". Dort ist ihre Marke da, also gehört sie dazu.");
  }

  await b.ende();
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(paket, { recursive: true, force: true });

  if (klagen.length) {
    console.log("Fußnoten: " + klagen.length + " Beanstandung(en)");
    for (const k of klagen) console.log("  - " + k);
    process.exit(1);
  }
  console.log("Fußnoten: jede Anmerkung erscheint mit ihrer Marke");
})().catch(e => { console.error(e); process.exit(1); });
