"""Package the public site without historical film exports and review pages."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import argparse, hashlib, json, re, shutil, subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=ROOT / '_site')
args = parser.parse_args()
output = args.output.resolve()
if output.exists():
    if not (output / '.marvel-pages-build').exists():
        raise SystemExit('Refusing to replace an unmarked output directory.')
    shutil.rmtree(output)
output.mkdir(parents=True)
(output / '.marvel-pages-build').touch()
tracked = set(subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')) - {''}

def read(name):
    path = ROOT / name
    return path.read_bytes() if path.is_file() else subprocess.check_output(['git', 'show', 'HEAD:' + name], cwd=ROOT)

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.hrefs.extend(value for key, value in attrs if key == 'href' and value)

pages = set()
pending = ['index.html', '404.html', 'privacy.html', 'terms.html', 'reservation-agreement.html', 'reservation-refunds.html']
pending += [urlsplit(node.text).path.lstrip('/') or 'index.html' for node in ET.fromstring(read('sitemap.xml')).iter() if node.tag.endswith('loc')]
while pending:
    name = pending.pop()
    if name in pages or name not in tracked:
        continue
    pages.add(name)
    links = Links()
    links.feed(read(name).decode())
    for href in links.hrefs:
        url = urlsplit(href)
        if url.netloc and url.netloc not in ('marvellabs.shop', 'www.marvellabs.shop'):
            continue
        path = unquote(url.path)
        path = path.lstrip('/') if path.startswith('/') else str(Path(name).parent / path)
        if path.endswith('.html') and path not in pages:
            pending.append(path)

# The release audit enumerates every current movie, including short feature clips.
manifest = json.loads(read('film-sources-hqworld4.json'))
movie_roots = set()
def sources(value):
    if isinstance(value, dict):
        if isinstance(value.get('base'), str) and value['base'].startswith('assets/'):
            movie_roots.add(str(Path(value['base']).parent) + '/')
        for child in value.values():
            sources(child)
    elif isinstance(value, list):
        for child in value:
            sources(child)
sources(manifest)
for name in pages:
    html = read(name).decode()
    movie_roots.update(value.rstrip('/') + '/' for value in re.findall(r'''data-film=["'](assets/[^"']+)''', html))
    for value in re.findall(r'''(?:data-)?src=["'](assets/[^"']+\.mp4(?:\?[^"']*)?)''', html):
        movie_roots.add(str(Path(value.split('?')[0]).parent) + '/')

source_only = {'scripts', 'tools', 'services', 'tests', 'work', 'render-work', '.github'}
selected = []
for name in sorted(tracked):
    parts = Path(name).parts
    if parts[0] in source_only or parts[0].startswith('yesterday'):
        continue
    if len(parts) == 1 and name.endswith('.html') and name not in pages:
        continue
    if name.endswith('.mp4') and not (name.startswith('crew/') or any(name.startswith(base) for base in movie_roots)):
        continue
    if parts[0].startswith('.') and name != '.nojekyll':
        continue
    selected.append(name)

# A persistent reader also handles the local sparse checkout without downloading
# or publishing development archives. CI uses ordinary files from its checkout.
objects = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
files = []
try:
    for name in selected:
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        source = ROOT / name
        if source.is_file():
            shutil.copyfile(source, target)
        else:
            objects.stdin.write(('HEAD:' + name + '\n').encode())
            objects.stdin.flush()
            header = objects.stdout.readline().decode().split()
            assert len(header) == 3 and header[1] == 'blob', (name, header)
            remaining = int(header[2])
            with target.open('wb') as stream:
                while remaining:
                    data = objects.stdout.read(min(8 * 1024 * 1024, remaining))
                    assert data, name
                    stream.write(data)
                    remaining -= len(data)
            assert objects.stdout.read(1) == b'\n'
        files.append({'file': name, 'bytes': target.stat().st_size})
finally:
    objects.stdin.close()
    objects.wait()

total = sum(item['bytes'] for item in files)
assert total < 900_000_000, f'Production site is too large: {total} bytes'
for base in movie_roots:
    audit = output / base / 'release-audit.json'
    if audit.exists():
        for name, info in json.loads(audit.read_text())['media'].items():
            movie = output / base / name
            assert movie.is_file(), movie
            assert hashlib.sha256(movie.read_bytes()).hexdigest() == info['sha256'], movie
report = {'bytes': total, 'pages': sorted(pages), 'movieRoots': sorted(movie_roots), 'files': files}
(output / 'build-manifest.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'files': len(files), 'pages': len(pages), 'megabytes': round(total / 1e6, 1), 'output': str(output)}))
