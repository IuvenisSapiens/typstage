// =============================================================================
// bidi.js — ein Firefox über WebDriver-BiDi, ohne npm
// =============================================================================
// Firefox ab 129 spricht auf `--remote-debugging-port` nur noch BiDi und kein
// CDP mehr, deshalb ein zweiter Treiber statt eines gemeinsamen. Die Fläche,
// die `pruefe-decks.js` benutzt, ist bei beiden dieselbe: `ev`, `navigiere`,
// `bild`, `ende`.
// =============================================================================
const { spawn } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");
const schlaf = ms => new Promise(r => setTimeout(r, ms));

// =============================================================================
// Aufraeumen, auch wenn der Lauf nicht bis `ende()` kommt
// =============================================================================
// Im Code wortgleich zu `cdp.js`, und aus demselben gemessenen Grund. Bis
// hierher hatte dieser Treiber keinen einzigen `process.on`-Haken: gemessen
// auf diesem Rechner, `pruefe-zeiger-ff.js` nach 20 s mit SIGINT abgebrochen,
// blieben ein Profil von 58436 KiB und elf Firefox-Prozesse liegen; mit den
// Haken sind es null und null. Die Chrome-Probe daneben liess unter derselben
// Behandlung keinen Prozess zurueck, weil `cdp.js` diese Zeilen hat -- wohl
// aber einen Profilordner von 12 KiB: Chrome schrieb nach `kill` noch hinein.
// Seit der Haken danach kurz wartet und nachfegt, bleibt dort keiner
// (gemessen, SIGINT an die Gruppe und an node allein).
//
// Solange dieser Treiber nur laden und knipsen konnte, hing an ihm ein Lauf;
// seit `pruefe-zeiger-ff.js` danebensteht, sind es zwei, und jeder oeffnet zwei
// Fenster.
//
// `exit` feuert auch nach einer geworfenen Ausnahme und nach einer nicht
// behandelten Zusage, und dort geht nur Synchrones -- `rmSync` und `kill` sind
// beides. Die Signalhaken darunter fangen den haeufigsten Fall: einen Lauf, den
// jemand von Hand wegdrueckt.
const offeneProfile = new Map();
let aufraeumenGesetzt = false;
function aufraeumenAnmelden(profil, kind) {
  offeneProfile.set(profil, kind);
  if (aufraeumenGesetzt) return;
  aufraeumenGesetzt = true;
  // Kurz synchron warten und dreimal fegen, wie in `cdp.js` (dort blieb
  // ohne das nach SIGINT ein Ordner liegen; hier nicht, gemessen -- der Code
  // bleibt trotzdem wortgleich).
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
  for (const zeichen of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(zeichen, () => process.exit(1));
  }
}

// SIGKILL laesst sich nicht abfangen, und ein Lauf, den jemand mit `kill -9`
// wegraeumt, kommt an `exit` und an den Signalhaken vorbei. Der einzige Ort,
// an dem sich das noch einsammeln laesst, ist der Start des *naechsten* Laufs.
// Sechs Stunden Abstand, wie in `cdp.js`: ein voller Decklauf dauert rund
// zwoelf Minuten, und die Schwelle trennt die Leichen von den Profilen
// laufender Nachbarn.
const ALTER_STUNDEN = 6;
let gefegt = false;
function alteProfileFegen() {
  if (gefegt) return;
  gefegt = true;
  const grenze = Date.now() - ALTER_STUNDEN * 3600 * 1000;
  let weg = 0, namen;
  try { namen = fs.readdirSync(os.tmpdir()); } catch (e) { return; }
  for (const name of namen) {
    if (!name.startsWith("typstage-bidi-")) continue;
    const ordner = path.join(os.tmpdir(), name);
    try {
      const st = fs.statSync(ordner);
      if (!st.isDirectory() || st.mtimeMs > grenze) continue;
      fs.rmSync(ordner, { recursive: true, force: true });
      weg++;
    } catch (e) { /* schon weg, oder nicht unser Recht */ }
  }
  if (weg) console.error("(" + weg + " liegengebliebene Firefox-Profile aufgeräumt)");
}

async function starte(binaer) {
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "typstage-bidi-"));
  const port = 9800 + Math.floor(Math.random() * 150);
  const kind = spawn(binaer, ["--headless", "--no-remote", "--profile", profil,
    "--remote-debugging-port", String(port), "about:blank"],
    { stdio: "ignore", env: Object.assign({}, process.env, { MOZ_HEADLESS: "1" }) });
  alteProfileFegen();
  aufraeumenAnmelden(profil, kind);
  // Und fuer SIGKILL ein Waechter ausserhalb von node. Die Haken oben
  // erreicht er nicht, und der Besen beim naechsten Start fegt nur Ordner:
  // gemessen, node nach 25 s mit SIGKILL beendet, liefen zwoelf
  // Firefox-Prozesse weiter, und ihr Profil wuchs in 17 s von 58424 auf
  // 97292 KiB. Der Waechter schlaeft, solange node lebt, und nimmt danach
  // nur einen Firefox, der noch DIESES Profil im Aufruf traegt -- eine
  // inzwischen neu vergebene Prozessnummer trifft er so nicht.
  try {
    spawn("/bin/sh", ["-c",
      'while kill -0 "$1" 2>/dev/null; do sleep 2; done; '
      + 'if ps -p "$2" -o command= 2>/dev/null | grep -qF -- "$3"; then '
      + 'kill "$2" 2>/dev/null; sleep 3; kill -9 "$2" 2>/dev/null; fi; '
      + 'rm -rf -- "$3"', "waechter", String(process.pid), String(kind.pid), profil],
      { detached: true, stdio: "ignore" }).unref();
  } catch (e) { /* ohne Waechter wie bisher */ }

  let ws = null;
  for (let i = 0; i < 120 && !ws; i++) {
    await schlaf(250);
    try {
      const s = new WebSocket(`ws://127.0.0.1:${port}/session`);
      await new Promise((r, j) => {
        s.addEventListener("open", r); s.addEventListener("error", j);
      });
      ws = s;
    } catch (e) { /* noch nicht oben */ }
  }
  if (!ws) {
    kind.kill();
    try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
    offeneProfile.delete(profil);
    throw new Error("Firefox meldete sich nicht auf " + port);
  }

  // Reisst die Leitung ab, weil Firefox mitten im Lauf stirbt, bekam bisher
  // kein offener Ruf je eine Antwort: die Zusage blieb haengen, node lief leer
  // und endete mit 0 -- ohne Klage und ohne „in Ordnung". Gemessen: Firefox
  // nach 25 s mit SIGKILL beendet, `pruefe-zeiger-ff.js` rc=0. Jetzt scheitert
  // jeder offene und jeder spaetere Ruf laut.
  let id = 0; const offen = new Map();
  let abgerissen = null;
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id != null && offen.has(m.id)) { offen.get(m.id).ja(m); offen.delete(m.id); }
  });
  ws.addEventListener("close", () => {
    abgerissen = new Error("BiDi: die Verbindung zu Firefox ist abgerissen");
    for (const [, w] of offen) w.nein(abgerissen);
    offen.clear();
  });
  const ruf = (method, params = {}) => new Promise((ja, nein) => {
    if (abgerissen) { nein(abgerissen); return; }
    const n = ++id; offen.set(n, { ja, nein });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

  const s = await ruf("session.new", { capabilities: { alwaysMatch: {} } });
  if (s.error) throw new Error("session.new: " + JSON.stringify(s));
  const baeume = async () =>
    (await ruf("browsingContext.getTree", {})).result.contexts.map(c => c.context);
  const ctx = (await baeume())[0];

  // WebDriver kennt die Sondertasten als Zeichen aus dem privaten Bereich,
  // nicht unter ihrem Namen. Ohne diese Tabelle käme `taste("ArrowRight")`
  // als elf einzelne Buchstaben an -- gemessen: das Deck blätterte nicht,
  // und die Probe hätte gemeldet, der Folienwechsel lasse den Punkt stehen.
  const SONDER = { ArrowRight: "\uE014", ArrowLeft: "\uE012",
                   ArrowUp: "\uE013", ArrowDown: "\uE015",
                   Escape: "\uE00C", Enter: "\uE007", Tab: "\uE004",
                   Home: "\uE011", End: "\uE010", " ": "\uE00D" };

  // Ein Fenster, als Fläche. Dieselben Namen wie in `cdp.js`, damit eine
  // Probe für beide Browser mit einem Wortschatz auskommt.
  //
  // `taste`, `schweb`, `maus` und `sicht` gibt es, seit der Zeiger auch in
  // Firefox gemessen wird: er hängt an echter Eingabe und an zwei Fenstern
  // verschiedener Größe, und beides kannte dieser Treiber bisher nicht --
  // `pruefe-decks.js` braucht nur laden und knipsen. `finger` und `aktiviere`
  // kamen dazu, als die Firefox-Probe auf dieselben Punkte gebracht wurde wie
  // die Chrome-Probe: der Finger und der Fokusverlust waren die zwei, die
  // ohne sie nicht zu messen waren.
  function fenster(c, eigen) {
    const ev = async (ausdruck) => {
      const m = await ruf("script.evaluate", { expression: ausdruck,
        target: { context: c }, awaitPromise: true, resultOwnership: "none" });
      if (m.error) throw new Error("BiDi: " + JSON.stringify(m).slice(0, 400));
      if (m.result.type === "exception")
        throw new Error("JS: " + ((m.result.exceptionDetails
          && m.result.exceptionDetails.text) || JSON.stringify(m.result)));
      const v = m.result.result;
      return v && "value" in v ? v.value : undefined;
    };
    const zeigen = (art, x, y, knopf) => ruf("input.performActions", {
      context: c, actions: [{ type: "pointer", id: "maus",
        parameters: { pointerType: "mouse" },
        actions: [{ type: "pointerMove", x: Math.round(x), y: Math.round(y),
                    origin: "viewport" }]
          .concat(art === "down" ? [{ type: "pointerDown", button: knopf || 0 }]
                : art === "up" ? [{ type: "pointerUp", button: knopf || 0 }] : [])
          .concat([{ type: "pause", duration: 60 }]) }] });
    return {
      name: "firefox", ruf, ev, ctx: c,
      // `wait: "complete"` statt eines festen Schlafs. Der Aufrufer wartet
      // danach trotzdem noch auf `window.typstage.pruef`: fertig geladen heißt
      // nicht, dass die Laufzeit ihr Deck schon aufgebaut hat.
      navigiere: (url) => ruf("browsingContext.navigate",
        { context: c, url, wait: "complete" }),
      bild: async () => (await ruf("browsingContext.captureScreenshot",
        { context: c })).result.data,
      // Die Bühne steht in Bruchteilen des Fensters; zwei verschieden große
      // Fenster sind der ganze Sinn der Zeigerprobe.
      sicht: (breite, hoehe) => ruf("browsingContext.setViewport",
        { context: c, viewport: { width: breite, height: hoehe } }),
      taste: (k) => {
        const v = SONDER[k] || k;
        return ruf("input.performActions", { context: c, actions: [
          { type: "key", id: "t", actions: [{ type: "keyDown", value: v },
                                            { type: "keyUp", value: v }] }] });
      },
      schweb: (x, y) => zeigen("move", x, y),
      maus: (art, x, y) => zeigen(art, x, y),
      // Der Finger. `pointerType: "touch"` und nicht die Maus: die Laufzeit
      // unterscheidet die beiden, und ein gehobener Finger nimmt den Punkt,
      // während eine losgelassene Maus ihn stehen lässt.
      finger: (art, x, y) => ruf("input.performActions", {
        context: c, actions: [{ type: "pointer", id: "finger",
          parameters: { pointerType: "touch" },
          actions: (art === "up" ? []
                    : [{ type: "pointerMove", x: Math.round(x), y: Math.round(y),
                         origin: "viewport" }])
            .concat(art === "down" ? [{ type: "pointerDown", button: 0 }]
                  : art === "up" ? [{ type: "pointerUp", button: 0 }] : [])
            .concat([{ type: "pause", duration: 80 }]) }] }),
      // Dieses Fenster nach vorn -- und damit dem anderen den Fokus nehmen.
      // Gemessen: `document.hasFocus()` am Pult geht dabei wirklich von
      // `true` auf `false`. In einem kopflosen Chrome geht das nicht, dort
      // bleibt jede Seite fokussiert; siehe den Kopf von `pruefe-zeiger.js`.
      aktiviere: () => ruf("browsingContext.activate", { context: c }),
      // Das zweite Fenster, das das Deck selbst geöffnet hat (Taste `n`). In
      // Firefox taucht es als weiterer Wurzelkontext im Baum auf.
      zweites: async (frist) => {
        const bekannt = await baeume();
        return {
          warte: async () => {
            for (let i = 0; i < (frist || 60); i++) {
              await schlaf(250);
              const jetzt = await baeume();
              const neu = jetzt.filter(x => !bekannt.includes(x));
              if (neu.length) return fenster(neu[0], false);
            }
            throw new Error("kein zweites Fenster erschienen");
          }
        };
      },
      // Erst `kill`, dann ein Blick, dann SIGKILL; und das Profil geht in
      // jedem Fall weg. Gemessen ist nur der saubere Lauf: mit dem Ende von
      // vorher (`browser.close`, 300 ms, `kill`) blieb danach ebenfalls kein
      // Prozess und kein Profil -- die elf Prozesse kamen vom Abbruch, und
      // den fangen die Haken oben. Der Blick danach ist Sicherung fuer einen
      // Firefox, der auf `kill` nicht hoert; diesen Fall hat hier keiner
      // gesehen.
      ende: async () => {
        if (!eigen) { try { await ruf("browsingContext.close", { context: c }); } catch (e) {} return; }
        try { await ruf("browser.close", {}); } catch (e) {}
        try { ws.close(); } catch (e) {}
        await schlaf(300);
        try { kind.kill(); } catch (e) {}
        await schlaf(400);
        if (kind.exitCode === null && kind.signalCode === null) {
          try { kind.kill("SIGKILL"); } catch (e) {}
          await schlaf(300);
        }
        try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
        offeneProfile.delete(profil);
      }
    };
  }
  return fenster(ctx, true);
}
module.exports = { starte, schlaf };
