"""Download actual TikTok CDN gift thumbnails and bundle small transparent WebPs."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from PIL import Image
import hashlib, io, json

root = Path(__file__).resolve().parents[1]
folder = root / 'assets/tiktok-gifts'
source = json.loads((folder / 'catalog-source.json').read_text(encoding='utf-8'))
ids = [5655,8913,5879,6784,5487,5658,5659,6968,5660,5509,18198,13072,13604,14440,47646,7610,7934,6064,5827,5269,6104,5585,6671,5586,6267,5897,11046,6369]

def prepare(g):
    url = g['image']['url_list'][0]
    assert urlparse(url).scheme == 'https' and urlparse(url).hostname.endswith('.tiktokcdn.com')
    with urlopen(Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=20) as response:
        raw = response.read(2_000_001)
    assert len(raw) <= 2_000_000
    image = Image.open(io.BytesIO(raw)).convert('RGBA')
    image.thumbnail((96,96), Image.Resampling.LANCZOS)
    target = folder / f'{g["id"]}.webp'
    image.save(target, 'WEBP', quality=88, method=6)
    data = target.read_bytes()
    return {'id':str(g['id']), 'name':g['name'], 'file':f'assets/tiktok-gifts/{target.name}', 'sourceUrl':url, 'sourceSha256':hashlib.sha256(raw).hexdigest(), 'sha256':hashlib.sha256(data).hexdigest(), 'bytes':len(data), 'size':list(image.size)}

with ThreadPoolExecutor(max_workers=6) as pool:
    items = list(pool.map(prepare, [next(g for g in source if g['id']==i) for i in ids]))
manifest = {'sourceCatalog':'https://github.com/antiops/tiktok-trending-data/blob/main/live-gift-details.json', 'retrievedOn':'2026-11-04', 'rights':'Gift artwork belongs to TikTok/ByteDance; these are identifiers of actual gifts, not original or CC0 assets.', 'items':items}
(folder/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(f'Prepared {len(items)} real gift thumbnails: {sum(g["bytes"] for g in items)} bytes total')
