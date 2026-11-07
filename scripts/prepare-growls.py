"""Prepare a real CC0 dog growl without pitch shifting."""
from pathlib import Path
import hashlib, json, math
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

root=Path(__file__).resolve().parents[1]
folder=root/'assets/audio/growl-bank'
source=folder/'dog-growl-original.ogg'
x,rate=sf.read(source,always_2d=True);x=x.mean(axis=1)
g=math.gcd(rate,32000);x=resample_poly(x,32000//g,rate//g);x-=x.mean()
rms=np.sqrt(np.mean(x*x));x*=min(.13/rms,.67/max(abs(x).max(),1e-9))
n=320;x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n)
x=np.pad(x,(640,1600))
bark,_=sf.read(root/'assets/audio/bark-bank/classic-1.wav')
variants={'growl-short':x,'bark-growl':np.concatenate([bark,np.zeros(1280),x])}
clips=[]
for key,y in variants.items():
    file=folder/(key+'.wav');sf.write(file,y,32000,subtype='PCM_16')
    clips.append({'id':key,'path':file.relative_to(root).as_posix(),'duration':len(y)/32000,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
profile={'id':'growl','label':'Gầm gừ thật','kind':'recording','author':'bonebrah','source':'https://opengameart.org/content/dog-growl','license':'CC0-1.0','clips':clips}
manifest={'sampleRate':32000,'channels':1,'playbackRate':1,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'processing':'Natural rate; mono resample; DC removal; RMS normalization with peak ceiling; 10ms fades. Bark-growl appends the real growl after the existing clear bark.','profiles':[profile]}
(folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'samples':len(clips),'durations':[c['duration'] for c in clips]}))
