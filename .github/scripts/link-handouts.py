"""Link handout gallery cards to the PDF built from their handout source."""
from pathlib import Path
import html
import sys

root = Path(sys.argv[1])
for page in (root / "index.html", root / "en.html"):
    text = page.read_text()
    for pdf in sorted(root.glob("*-ho-*.pdf")):
        source = html.escape(pdf.stem + ".html", quote=True)
        target = html.escape(pdf.name, quote=True)
        assert pdf.stat().st_size > 0, f"Empty handout: {pdf}"
        assert f'href="{source}"' in text, f"Missing gallery card: {pdf.stem}"
        text = text.replace(f'href="{source}"', f'href="{target}"')
        text = text.replace(html.escape(pdf.stem.replace("-", " ")), "Handout: " + html.escape(pdf.stem.split("-ho-", 1)[1]))
    page.write_text(text)
