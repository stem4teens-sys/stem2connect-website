"""Catch extra blocking requests in the generated homepage enhancements."""
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class Startup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.external = []
        self.embedded = set()
        self.contents = {}
        self.current = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        url = attrs.get('src', attrs.get('href', '')).split('?')[0]
        if url in ('observatory-entry.js', 'enhancements.css'):
            self.external.append(url)
        if attrs.get('data-enhancement'):
            self.embedded.add(attrs['data-enhancement'])
            self.current = attrs['data-enhancement']
            self.contents[self.current] = ''

    def handle_data(self, data):
        if self.current:
            self.contents[self.current] += data

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.current = None

page = Startup()
page.feed((ROOT / 'index.html').read_text())
assert not page.external, f'Homepage enhancement startup still waits for: {page.external}'
assert page.embedded == {'styles', 'globe'}, 'Both generated startup blocks must be present'
for name, filename in (('styles', 'enhancements.css'), ('globe', 'observatory-entry.js')):
    assert page.contents[name].strip() == (ROOT / filename).read_text().strip(), f'Stale embedded {name}; rebuild enhancements'
print('Pass: homepage enhancement styles and globe loader need no extra HTTP request.')
