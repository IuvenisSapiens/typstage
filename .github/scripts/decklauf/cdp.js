// =============================================================================
// cdp.js — ein Chrome über das DevTools-Protokoll, ohne npm
// =============================================================================
// Node ab 21 bringt `fetch` und `WebSocket` global mit, und mehr braucht es
// nicht. Bewusst keine Playwright-Abhängigkeit: ob dieses Paket prüfbar ist,
// soll nicht davon abhängen, dass jemand vorher 200 MB Browser herunterlädt.
// =============================================================================
const { spawn } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");

const schlaf = ms => new Promise(r => setTimeout(r, ms));

// =============================================================================
// Was ein harter Abbruch hinterlässt -- und was ein schlafender Rechner kostet
// =============================================================================
// Beides einmal je Prozess, beim ersten `starte()`.

let einmalGetan = false;

// SIGKILL lässt sich nicht abfangen, und ein Lauf, den jemand mit `kill -9`
// wegräumt oder den der Rechner im Schlaf verliert, kommt an `exit` und an
// den Signalhaken unten vorbei. Der einzige Ort, an dem sich das noch
// einsammeln lässt, ist der Start des *nächsten* Laufs.
//
// Gemessen auf dem Entwicklungsrechner: 4306 liegengebliebene Profile, 912 MB,
// aus abgebrochenen Läufen über mehrere Monate. Die Altersschwelle trennt sie
// von den Profilen laufender Nachbarn -- ein voller Decklauf dauert rund
// zwölf Minuten, sechs Stunden sind also reichlich Abstand.
const ALTER_STUNDEN = 6;
function alteProfileFegen() {
  const grenze = Date.now() - ALTER_STUNDEN * 3600 * 1000;
  let weg = 0;
  let namen;
  try { namen = fs.readdirSync(os.tmpdir()); } catch (e) { return; }
  for (const name of namen) {
    if (!name.startsWith("typstage-")) continue;
    const ordner = path.join(os.tmpdir(), name);
    try {
      const st = fs.statSync(ordner);
      if (!st.isDirectory() || st.mtimeMs > grenze) continue;
      fs.rmSync(ordner, { recursive: true, force: true });
      weg++;
    } catch (e) { /* schon weg, oder nicht unser Recht */ }
  }
  if (weg) console.error("(" + weg + " liegengebliebene Profile aufgeräumt)");
}

// Ein voller Lauf dauert länger, als ein Laptop wach bleibt. Schläft der
// Rechner mittendrin ein, steht der Lauf still und sieht aus wie abgestürzt --
// gemessen: drei Stunden ohne eine Zeile Ausgabe, und der Lauf war völlig in
// Ordnung. `-w` bindet die Wache an diesen Prozess, sie endet also mit ihm,
// auch wenn er abstürzt. `-i` hält nur den Leerlaufschlaf auf; wer den Deckel
// zuklappt, schläft weiterhin.
function wachHalten() {
  if (process.platform !== "darwin") return;
  try {
    spawn("caffeinate", ["-i", "-w", String(process.pid)],
          { detached: true, stdio: "ignore" }).unref();
  } catch (e) { /* ohne caffeinate lief es bisher auch */ }
}

// =============================================================================
// Aufräumen, auch wenn der Lauf nicht bis `ende()` kommt
// =============================================================================
// Jeder Browser bekommt ein eigenes Profil im Temp-Verzeichnis, und ein Profil
// wiegt gemessen 68 MB. `ende()` räumt es weg -- aber `ende()` steht am Ende,
// und eine Probe, die vorher wirft, kommt nie dort an. Gemessen auf dem
// Entwicklungsrechner nach einigen Monaten Prüfläufen: 1146 liegengebliebene
// Profile, zusammen 51 GB. Ein Lauf legt rund zwanzig an, und einer davon
// startete gar nicht mehr, weil zu viele verwaiste Chromes den Port hielten.
//
// `exit` feuert auch nach einer geworfenen Ausnahme und nach einer nicht
// behandelten Zusage, und dort geht nur Synchrones -- `rmSync` und `kill` sind
// beides.
const offeneProfile = new Map();
let aufraeumenGesetzt = false;
function aufraeumenAnmelden(profil, kind) {
  offeneProfile.set(profil, kind);
  if (aufraeumenGesetzt) return;
  aufraeumenGesetzt = true;
  // Nach `kill` schreibt Chrome beim Beenden noch in sein Profil. Gleich
  // danach geloescht, blieb nach SIGINT ein Ordner liegen (gemessen 12 und
  // 52 KiB); darum kurz synchron warten und dreimal fegen -- in `exit` geht
  // nur Synchrones, und `Atomics.wait` ist das.
  process.on("exit", () => {
    for (const [, k] of offeneProfile) { try { if (k) k.kill(); } catch (e) {} }
    const warte = (ms) => {
      try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (e) {}
    };
    for (let i = 0; i < 3; i++) {
      warte(i ? 300 : 700);
      for (const [ordner] of offeneProfile) {
        try { fs.rmSync(ordner, { recursive: true, force: true }); } catch (e) {}
      }
    }
  });
  // Ohne das hier beendet ein Abbruch von Hand den Prozess, ohne `exit` zu
  // durchlaufen, und genau der Fall -- ein Lauf, den jemand wegdrückt -- ist
  // der häufigste Grund für ein liegengebliebenes Profil.
  for (const zeichen of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(zeichen, () => process.exit(1));
  }
}

async function starte(binaer) {
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "typstage-cdp-"));
  // Den Port vergibt das Betriebssystem (`0`), und Chrome schreibt ihn in die
  // erste Zeile von `DevToolsActivePort` im eigenen Profil. Gewürfelt aus
  // 9200-9899, wie bisher, konnte er schon einem anderen Chrome gehören -- dem
  // einer Probe, die daneben läuft. Der neue kam dann nicht an den Port, und
  // dieser Lauf sprach mit dem fremden: nachgestellt mit einem fremden Chrome
  // auf dem gewürfelten Port, dessen Seite dieser Lauf dann las. Gesehen hatte
  // das ein Prüfer, der mehrere Proben zugleich laufen ließ, als Bildschirmfoto
  // eines fremden Decks.
  const kind = spawn(binaer, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--mute-audio",
    "--force-device-scale-factor=1", "--hide-scrollbars",
    // Ein Deck liegt als Datei da und lädt seine Medien daneben. Ohne das
    // hier zählt jede davon als fremde Herkunft und wird abgelehnt.
    "--allow-file-access-from-files",
    `--user-data-dir=${profil}`, "--window-size=1600,900",
    "--remote-debugging-port=0", "about:blank"
  ], { stdio: "ignore" });
  if (!einmalGetan) { einmalGetan = true; alteProfileFegen(); wachHalten(); }
  aufraeumenAnmelden(profil, kind);
  // Und für SIGKILL ein Wächter außerhalb von node, im Aufruf gleich dem in
  // `bidi.js`. Die Haken oben erreicht ein SIGKILL nicht, und der Besen beim
  // nächsten Start fegt nur Ordner, die sechs Stunden alt sind -- den Chrome
  // darin nimmt er nicht mit. Gemessen ohne Wächter: node mit SIGKILL
  // beendet, liefen nach 20 s noch sieben Chrome-Prozesse, und das Profil
  // lag. Der Wächter schläft, solange node lebt, und nimmt danach nur einen
  // Chrome, der noch DIESES Profil im Aufruf trägt.
  try {
    spawn("/bin/sh", ["-c",
      'while kill -0 "$1" 2>/dev/null; do sleep 2; done; '
      + 'if ps -p "$2" -o command= 2>/dev/null | grep -qF -- "$3"; then '
      + 'kill "$2" 2>/dev/null; sleep 3; kill -9 "$2" 2>/dev/null; fi; '
      + 'rm -rf -- "$3"', "waechter", String(process.pid), String(kind.pid), profil],
      { detached: true, stdio: "ignore" }).unref();
  } catch (e) { /* ohne Wächter wie bisher */ }

  let port = 0, ziel = null;
  for (let i = 0; i < 120 && !ziel; i++) {
    await schlaf(250);
    if (!port) {
      try {
        port = +fs.readFileSync(path.join(profil, "DevToolsActivePort"), "utf8").split("\n")[0];
      } catch (e) { /* noch nicht geschrieben */ }
      if (!port) continue;
    }
    try {
      const liste = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      ziel = liste.find(x => x.type === "page" && x.webSocketDebuggerUrl);
    } catch (e) { /* noch nicht oben */ }
  }
  if (!ziel) {
    kind.kill();
    throw new Error("Chrome meldete sich nicht" + (port ? " auf " + port : ", kein DevToolsActivePort"));
  }

  const verbindung = await verbinde(ziel.webSocketDebuggerUrl, kind, profil);
  // Ein zweites Fenster, das das Deck selbst geöffnet hat (Taste `n`). Es
  // taucht in `/json` als weitere Seite auf; mehr braucht es nicht, um die
  // Fernsteuerung wirklich zu prüfen -- mit nur einem Fenster kann kein Test
  // sehen, ob eine Zuordnung auch drüben ankommt.
  verbindung.zweites = async function (frist) {
    const bekannt = ziel.webSocketDebuggerUrl;
    for (let i = 0; i < (frist || 60); i++) {
      await schlaf(250);
      try {
        const liste = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        const z = liste.find(x => x.type === "page" && x.webSocketDebuggerUrl
                                  && x.webSocketDebuggerUrl !== bekannt);
        if (z) return await verbinde(z.webSocketDebuggerUrl, null, null);
      } catch (e) { /* noch nicht da */ }
    }
    throw new Error("kein zweites Fenster erschienen");
  };
  return verbindung;
}

async function verbinde(wsUrl, kind, profil) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => {
    ws.addEventListener("open", r); ws.addEventListener("error", j);
  });
  // Wie in `bidi.js`: stirbt Chrome mitten im Lauf, scheitert jeder offene
  // und jeder spaetere Ruf laut, statt ewig zu warten. Gemessen vorher:
  // Chrome nach 25 s mit SIGKILL beendet, `pruefe-zeiger.js` rc=0.
  let id = 0; const offen = new Map();
  let abgerissen = null;
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id && offen.has(m.id)) { offen.get(m.id).ja(m); offen.delete(m.id); }
  });
  ws.addEventListener("close", () => {
    abgerissen = new Error("CDP: die Verbindung zu Chrome ist abgerissen");
    for (const [, w] of offen) w.nein(abgerissen);
    offen.clear();
  });
  const ruf = (method, params) => new Promise((ja, nein) => {
    if (abgerissen) { nein(abgerissen); return; }
    const n = ++id; offen.set(n, { ja, nein });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const ev = async (ausdruck) => {
    const m = await ruf("Runtime.evaluate",
      { expression: ausdruck, returnByValue: true, awaitPromise: true });
    const f = m.result && m.result.exceptionDetails;
    if (f) throw new Error("JS: " + f.text + " "
      + ((f.exception && f.exception.description) || ""));
    return m.result && m.result.result && m.result.result.value;
  };
  await ruf("Page.enable", {});
  return {
    name: "chrome", ruf, ev,
    navigiere: (url) => ruf("Page.navigate", { url }),
    bild: async () => (await ruf("Page.captureScreenshot", { format: "png" })).result.data,
    // `mod` sind die Modifikatoren, wie das Protokoll sie zaehlt: 8 ist
    // Umschalt. Gebraucht wird das fuer `⇧←`/`⇧→`, die die Vollbilduhr
    // verlaengern -- eine Geste, die sich ohne Umschalt nicht pruefen laesst.
    taste: (k, mod) => ruf("Input.dispatchKeyEvent", {
      type: "keyDown", key: k, modifiers: mod || 0,
      text: k.length === 1 ? k : undefined,
      windowsVirtualKeyCode: k.length === 1 ? k.charCodeAt(0) : undefined
    }).then(() => ruf("Input.dispatchKeyEvent",
      { type: "keyUp", key: k, modifiers: mod || 0 })),
    // Erst warten, bis Chrome WIRKLICH fort ist, dann das Profil. Bisher
    // folgte `rmSync` gleich auf `kill`, und Chrome schrieb beim Beenden
    // weiter in den Ordner: gemessen blieben nach einem sauberen Lauf von
    // `pruefe-zeiger.js` alle sieben Profile liegen, 44096 KiB.
    ende: async () => {
      try { ws.close(); } catch (e) {}
      if (!kind) return;
      await schlaf(200);
      const fort = new Promise(r => {
        if (kind.exitCode !== null || kind.signalCode !== null) r();
        else kind.once("exit", r);
      });
      kind.kill();
      await Promise.race([fort, schlaf(5000)]);
      if (kind.exitCode === null && kind.signalCode === null) {
        try { kind.kill("SIGKILL"); } catch (e) {}
        await Promise.race([fort, schlaf(2000)]);
      }
      try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
      offeneProfile.delete(profil);
    }
  };
}
module.exports = { starte, schlaf };
