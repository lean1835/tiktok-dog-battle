"""Reproducible downloads; keeps source/license evidence and SHA256 per asset."""
from pathlib import Path
import urllib.request, urllib.parse, json, base64, struct, hashlib, concurrent.futures

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://raw.githubusercontent.com/agentkaerf/FreeModels/main/'
QUAT = [
 ('shiba', 'Shiba vàng', 'Ultimate Animated Animals - July 2021/glTF/ShibaInu.gltf', 'ultimateanimatedanimals'),
 ('husky', 'Husky', 'Ultimate Animated Animals - July 2021/glTF/Husky.gltf', 'ultimateanimatedanimals'),
 ('pug', 'Pug', 'Zombie Apocalypse Kit - March 2024/Characters/glTF/Characters_Pug.gltf', 'zombieapocalypsekit'),
 ('becgie', 'Becgie', 'Zombie Apocalypse Kit - March 2024/Characters/glTF/Characters_GermanShepherd.gltf', 'zombieapocalypsekit'),
]
def get(url):
 return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=60).read()
def glb(j):
 assert len(j['buffers']) == 1
 b = base64.b64decode(j['buffers'][0].pop('uri').split(',')[1])
 a = json.dumps(j,separators=(',',':')).encode(); a += b' ' * (-len(a)%4); b += b'\0' * (-len(b)%4)
 return struct.pack('<III',0x46546c67,2,28+len(a)+len(b))+struct.pack('<II',len(a),0x4e4f534a)+a+struct.pack('<II',len(b),0x004e4942)+b
def save(id,name,data,url,author,source,kind='model',changes='None'):
 path = ROOT / 'assets' / ('models' if kind=='model' else 'audio') / (id + ('.glb' if kind=='model' else '.mp3'))
 path.write_bytes(data)
 return dict(id=id,name=name,path=path.relative_to(ROOT).as_posix(),download=url,source=source,author=author,license='CC0-1.0',licenseUrl='https://creativecommons.org/publicdomain/zero/1.0/',sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),changes=changes)
def fetch_quat(spec):
 id,name,p,pack=spec;url=BASE+urllib.parse.quote(p)
 source='https://quaternius.com/packs/'+pack+'.html'
 evidence=get(source)
 if b'creativecommons.org/publicdomain/zero' not in evidence: raise RuntimeError('CC0 evidence absent: '+source)
 (ROOT/'assets/licenses'/('quaternius-'+pack+'.html')).write_bytes(evidence)
 return save(id,name,glb(json.loads(get(url))),url,'Quaternius',source,changes='Embedded glTF repackaged losslessly as GLB; runtime scale normalization, shadows and lighting.')
if __name__=='__main__':
 for d in ['models','audio','licenses']: (ROOT/'assets'/d).mkdir(parents=True,exist_ok=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: assets=list(pool.map(fetch_quat,QUAT))
 dragon_source='https://poly.pizza/m/LlwD0QNUPj'
 evidence=get(dragon_source)
 if b'creativecommons.org/publicdomain/zero' not in evidence: raise RuntimeError('Dragon CC0 evidence absent')
 (ROOT/'assets/licenses/quaternius-dragon-evolved.html').write_bytes(evidence)
 url='https://static.poly.pizza/90ed3740-d8c4-4910-88ce-ac2ed426022d.glb'
 assets.append(save('dragon','Rồng thiên không',get(url),url,'Quaternius',dragon_source,changes='Runtime scale normalization, animation aliasing, shadows and lighting.'))
 manifest=json.loads(get('https://gobkit.com/api/free'))
 for id in ['corgi','tiger']:
  m=next(m for p in manifest['packs'] for m in p['models'] if m['id']==id)
  (ROOT/'assets/licenses'/('gobkit-'+id+'.json')).write_text(json.dumps(m,indent=2),encoding='utf-8')
  assets.append(save(id, 'Corgi' if id=='corgi' else 'Hổ vằn', get(m['url']),m['url'],'Gobkit','https://gobkit.com/freebies',changes='Runtime scale normalization, shadows and lighting.'))
 for id,url,source,author in [
  ('bark-small','https://cdn.freesound.org/previews/452/452180_612689-hq.mp3','https://freesound.org/people/kyles/sounds/452180/','kyles'),
  ('bark-medium','https://cdn.freesound.org/previews/749/749351_16213215-hq.mp3','https://freesound.org/people/wateenfotos/sounds/749351/','wateenfotos')]:
  evidence=get(source)
  if b'creativecommons.org/publicdomain/zero' not in evidence: raise RuntimeError('Audio CC0 evidence absent')
  (ROOT/'assets/licenses'/(id+'.html')).write_bytes(evidence)
  assets.append(save(id,id,get(url),url,author,source,'audio','HQ MP3 preview. Converted to trimmed, faded mono WAV variations by prepare-audio.py.'))
 (ROOT/'assets/manifest.json').write_text(json.dumps({'verifiedOn':'2026-11-03','assets':assets},ensure_ascii=False,indent=2),encoding='utf-8')
 print('Downloaded',len(assets),'assets;',round(sum(a['bytes'] for a in assets)/1024/1024,2),'MiB')

