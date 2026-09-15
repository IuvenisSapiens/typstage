#!/usr/bin/env python3
"""pruefe-woerter.py — tragen alle drei Sprachen dieselben Schlüssel?

`runtime-words` in src/config.typ hält die Wörter, die die Laufzeit selbst
anzeigt, in de, en und fr. Fehlt ein Schlüssel in einer Sprache, fällt
`wort(k, rueckfall)` still auf den englischen Text im zweiten Argument
zurück -- kein Fehler, keine Meldung, und in der französischen Ansicht steht
plötzlich ein englisches Wort.

Genau das ist beim Einbau der Klangtaste passiert: der französische Eintrag
hieß `son:` statt `sound:`, also derselbe Text unter einem anderen Schlüssel.
Auffallen konnte es nur jemandem, der die Ansicht auf Französisch aufmacht.

    python3 .github/scripts/pruefe-woerter.py
"""
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]
QUELLE = WURZEL / "src" / "config.typ"


def ohne_beiwerk(text):
    """Kommentare und Zeichenkettenrümpfe weg -- beide tragen Doppelpunkte."""
    text = re.sub(r'"(?:[^"\\]|\\.)*"', '""', text)
    return re.sub(r"//[^\n]*", "", text)


def bloecke(quelle):
    """Je Sprache der Rumpf ihres Eintrags in `listen`."""
    aus = {}
    for sprache in ("de", "en", "fr"):
        # Vom Sprachnamen bis zum nächsten Sprachnamen auf derselben Ebene.
        treffer = re.search(
            r"\n    " + sprache + r": \((.*?)\)\),\n(?=    [a-z]{2}: \(|  \)\n)",
            quelle, re.S)
        if not treffer:
            print(f"pruefe-woerter: der Block „{sprache}“ ist nicht auffindbar --"
                  f" hat sich der Aufbau von runtime-words geändert?")
            sys.exit(1)
        aus[sprache] = treffer.group(1)
    return aus


def schluessel(rumpf):
    """Die Schlüssel einer Ebene: oberste und die des `sp`-Teils, getrennt.

    Der Rumpf kommt ohne seine schließende Klammer herein -- die hat der
    Blockausdruck oben schon verbraucht. Also wird bei `sp: (` geteilt und
    nicht auf eine schließende Klammer gewartet, die es hier nicht gibt.
    """
    sauber = ohne_beiwerk(rumpf)
    schnitt = sauber.find("sp: (")
    if schnitt < 0:
        print("pruefe-woerter: der `sp`-Teil ist nicht auffindbar --"
              " hat sich der Aufbau von runtime-words geändert?")
        sys.exit(1)
    hole = lambda s: set(re.findall(r"([a-zA-Z][\w-]*)\s*:", s))
    return hole(sauber[:schnitt]), hole(sauber[schnitt + 5:])


def main():
    quelle = QUELLE.read_text(encoding="utf-8")
    teile = bloecke(quelle)
    oben, innen = {}, {}
    for sprache, rumpf in teile.items():
        oben[sprache], innen[sprache] = schluessel(rumpf)

    klagen = []
    for name, tafel in (("runtime-words", oben), ("runtime-words.sp", innen)):
        alle = set().union(*tafel.values())
        for sprache, hat in tafel.items():
            for fehlt in sorted(alle - hat):
                andere = sorted(s for s, h in tafel.items() if fehlt in h)
                klagen.append(
                    f"{name}.{fehlt} fehlt in „{sprache}“ "
                    f"(vorhanden in {', '.join(andere)})")

    if klagen:
        print(f"Wörterbuch: {len(klagen)} Punkt(e)\n")
        for k in klagen:
            print("  • " + k)
        print("\n  Ein fehlender Schlüssel fällt still auf den englischen")
        print("  Rückfall in `wort(k, …)` zurück und meldet sich nie.")
        sys.exit(1)

    n = len(set().union(*oben.values())) + len(set().union(*innen.values()))
    print(f"Wörterbuch: in Ordnung ({n} Schlüssel in de, en und fr)")


if __name__ == "__main__":
    main()
