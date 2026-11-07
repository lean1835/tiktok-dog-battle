"""Build real-recording bark variations. No pitch shifting or synthesized voices."""
from pathlib import Path
import json, hashlib, math
import numpy as np, soundfile as sf
ROOT=Path(__file__).resolve().parents[1]
BANK=ROOT/'assets/audio/bark-bank'
RATE=32000
profiles=[]
def resample(x,sr):
 if sr==RATE:return x
 # Small offline audio clips; sinc resampling when scipy is available.
 try:
  from scipy.signal import resample_poly
  g=math.gcd(sr,RATE);return resample_poly(x,RATE//g,sr//g)
 except ImportError:
  return np.interp(np.arange(int(len(x)*RATE/sr))*sr/RATE,np.arange(len(x)),x)
def process(x,sr):
 x=resample(x,sr);x=x-x.mean()
 env=np.array([np.sqrt(np.mean(x[i:i+320]**2)) for i in range(0,len(x),320)])
 threshold=max(float(env.max())*.15,.003)
 mask=np.repeat(env>threshold,320)[:len(x)]
 rms=float(np.sqrt(np.mean(x[mask]**2))) if mask.any() else 0
 if rms<.005:raise RuntimeError('Clip too quiet')
 x*=min(.14/rms,.708/max(float(abs(x).max()),1e-9))
 n=min(int(.005*RATE),len(x)//8);x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n)
 return np.pad(x,(int(.025*RATE),int(.08*RATE)))
def add(key,label,cuts,double=False):
 meta=json.loads((BANK/(key+'-source.json')).read_text())
 x,sr=sf.read(BANK/(key+'-source.mp3'),always_2d=True);x=x.mean(axis=1)
 clips=[]
 for i,(start,end) in enumerate(cuts):
  y=process(x[int(start*sr):int(end*sr)],sr)
  file=BANK/(key+'-'+str(i+1)+'.wav');sf.write(file,y,RATE,subtype='PCM_16')
  clips.append(dict(id=key+'-'+str(i+1),path=file.relative_to(ROOT).as_posix(),duration=len(y)/RATE,sourceStart=start,sourceEnd=end,sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
 if double:
  y,_=sf.read(BANK/(key+'-1.wav'));y=np.concatenate([y,np.zeros(int(.12*RATE)),y])
  file=BANK/(key+'-double.wav');sf.write(file,y,RATE,subtype='PCM_16')
  clips.append(dict(id=key+'-double',path=file.relative_to(ROOT).as_posix(),duration=len(y)/RATE,derivedFrom=key+'-1',changes='Two real barks with 120 ms natural gap; no pitch change.',sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
 profiles.append(dict(id=key,label=label,source=meta['source'],author=meta['author'],license=meta['license'],clips=clips))
# Keep the original clear bark, plus a real-sample double-bark pattern.
classic=json.loads((ROOT/'assets/audio/bark-clear-source.json').read_text())
(BANK/'classic-source.json').write_text(json.dumps(classic))
(BANK/'classic-source.mp3').write_bytes((ROOT/'assets/audio/bark-clear-original.mp3').read_bytes())
add('classic','Gâu gọn',[(0,.389)],True)
add('toy','Chó nhỏ Shih Tzu',[(.20,.5689)],True)
add('shepherd','Chó chăn cừu',[(.15,.96),(1.5,2.42),(4.875,5.45)])
add('brisk','Gâu nhanh',[(.15,.65),(.9,1.4),(1.875,2.45)])
add('small','Gâu cao',[(.67,1.5),(3.2,4.10),(6.05,6.95)])
add('round','Gâu dài',[(.15,1.45),(1.58,2.10)])
manifest=dict(license='CC0-1.0',sampleRate=RATE,channels=1,playbackRate=1,processing='Mono, DC removal, active RMS target with -3 dBFS peak ceiling, 5ms fades; original natural playback rate.',profiles=profiles)
(BANK/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Voices:',len(profiles),'clips:',sum(len(p['clips']) for p in profiles),'PCM bytes:',sum((ROOT/c['path']).stat().st_size for p in profiles for c in p['clips']))
