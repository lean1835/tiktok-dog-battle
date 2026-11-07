"""Prepare a recorded tiger vocalization and designed dragon effects at native pitch."""
from pathlib import Path
import hashlib, json, math
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / 'assets/audio/creature-bank'
RATE = 32000

def clip(key, start, end):
    meta = json.loads((BANK / (key + '-source.json')).read_text())
    x, sr = sf.read(BANK / (key + '-source.mp3'), always_2d=True)
    x = x[int(start * sr):int(end * sr)].mean(axis=1)
    g = math.gcd(sr, RATE)
    x = resample_poly(x, RATE // g, sr // g)
    x -= x.mean()
    env = np.array([np.sqrt(np.mean(x[i:i+320]**2)) for i in range(0, len(x), 320)])
    mask = np.repeat(env > max(float(env.max()) * .15, .003), 320)[:len(x)]
    rms = float(np.sqrt(np.mean(x[mask]**2)))
    if rms < .005:
        raise RuntimeError('Clip too quiet: ' + key)
    x *= min(.14 / rms, .708 / float(abs(x).max()))
    n = int(.02 * RATE)
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    x = np.pad(x, (int(.025 * RATE), int(.08 * RATE)))
    file = BANK / (key + '.wav')
    sf.write(file, x, RATE, subtype='PCM_16')
    return dict(id=key, path=file.relative_to(ROOT).as_posix(), duration=len(x)/RATE,
                source=meta['source'], author=meta['author'], license=meta['license'],
                sourceStart=start, sourceEnd=end,
                sha256=hashlib.sha256(file.read_bytes()).hexdigest())

profiles = [
    dict(id='tiger', label='Hổ gầm', kind='recording', clips=[clip('tiger', .95, 2.35)]),
    dict(id='dragon', label='Rồng Trung Hoa', kind='designed',
         clips=[clip('dragon-a', 0, 1.85), clip('dragon-b', .05, 2.95)])
]
manifest = dict(sampleRate=RATE, channels=1, playbackRate=1,
    processing='Mono, DC removal, active RMS target .14, peak ceiling -3 dBFS, 20ms edge fades; no runtime pitch change.',
    profiles=profiles)
(BANK / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
preview = np.concatenate([np.concatenate([sf.read(ROOT/c['path'])[0], np.zeros(int(.5*RATE))])
                          for p in profiles for c in p['clips']])
sf.write(BANK / 'tiger-dragon-preview.wav', preview, RATE, subtype='PCM_16')
print('Creature voices:', len(profiles), 'clips:', sum(len(p['clips']) for p in profiles))
