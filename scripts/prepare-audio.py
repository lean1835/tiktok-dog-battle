"""Extract an isolated bark, remove DC, normalize peak, add click-free fades."""
from pathlib import Path
import numpy as np, soundfile as sf, json, hashlib
root=Path(__file__).resolve().parents[1]
report=[]
for kind in ['small','medium']:
 p=root/'assets/audio'/('bark-'+kind+'.mp3')
 x,sr=sf.read(p,always_2d=True); x=x.mean(axis=1); x-=x.mean()
 # Find the first energetic bark, retain its onset and decay, avoid a full noisy recording.
 win=max(1,int(.01*sr)); env=np.array([np.sqrt(np.mean(x[i:i+win]**2)) for i in range(0,len(x),win)])
 threshold=max(.012,float(env.max())*.18)
 hot=np.where(env>threshold)[0]
 if not len(hot): raise RuntimeError('No bark found')
 start=max(0,int(hot[0]*win-.025*sr)); end=min(len(x),start+int(.85*sr))
 x=x[start:end]; x/=max(1e-9,float(np.max(np.abs(x))));x*=10**(-3/20)
 fade=min(int(.012*sr),len(x)//4);x[:fade]*=np.linspace(0,1,fade);x[-fade:]*=np.linspace(1,0,fade)
 out=p.with_suffix('.wav');sf.write(out,x,sr,subtype='PCM_16')
 report.append(dict(path=out.relative_to(root).as_posix(),duration=len(x)/sr,sampleRate=sr,channels=1,peakDb=-3,source=p.name,sourceStart=start/sr,sha256=hashlib.sha256(out.read_bytes()).hexdigest()))
(root/'assets/audio/processing.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
