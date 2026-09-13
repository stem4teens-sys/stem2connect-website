"""Embed only the added homepage styles/loader; their source files stay editable.

The existing GitHub build regenerates these blocks on every deployment.
Keep external files for the other pages and for independent development.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
index = ROOT / 'index.html'
html = index.read_bytes().decode('utf-8')
newline = '\r\n' if '\r\n' in html else '\n'

for name, filename, tag, fallback in (
    ('styles', 'enhancements.css', 'style', r'<link\b[^>]*href="enhancements\.css[^\"]*"[^>]*>'),
    ('globe', 'observatory-entry.js', 'script', r'<script\b[^>]*src="observatory-entry\.js[^\"]*"[^>]*>\s*</script>'),
):
    source = (ROOT / filename).read_text().strip()
    if re.search(r'</' + tag, source, re.I):
        raise SystemExit(f'Unexpected closing {tag} tag in {filename}')
    start, end = f'<!-- enhancement-{name}:start -->', f'<!-- enhancement-{name}:end -->'
    attributes = ' type="module"' if tag == 'script' else ''
    block = newline.join((start, f'  <{tag}{attributes} data-enhancement="{name}">{source}</{tag}>', f'  {end}'))
    pattern = re.escape(start) + r'.*?' + re.escape(end) if start in html else fallback
    html, count = re.subn(pattern, lambda _: block, html, flags=re.S)
    if count != 1:
        raise SystemExit(f'Expected exactly one homepage {name} block, got {count}')

index.write_bytes(html.encode('utf-8'))
print('Embedded homepage enhancement startup; content and source assets retained.')
