const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),bank=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/bark-bank/manifest.json')));
test('Six distinct licensed recordings produce fifteen different natural bark variations',()=>{
 assert.equal(bank.profiles.length,6);assert.equal(new Set(bank.profiles.map(p=>p.source)).size,6);assert.equal(bank.playbackRate,1);
 const hashes=[];for(const p of bank.profiles){assert.equal(p.license,'CC0-1.0');assert.ok(p.clips.length>=2);for(const c of p.clips){const b=fs.readFileSync(path.join(root,c.path));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),c.sha256);hashes.push(c.sha256);assert.ok(c.duration>.3&&c.duration<1.8);}}
 assert.equal(hashes.length,15);assert.equal(new Set(hashes).size,15);
});

test('Tiger recording and dragon effects carry source credits and safe mono PCM signal',()=>{
 const creatures=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/creature-bank/manifest.json')));
 assert.deepEqual(creatures.profiles.map(p=>p.id),['tiger','dragon']);
 assert.equal(creatures.profiles[0].kind,'recording');assert.equal(creatures.profiles[1].kind,'designed');
 for(const p of creatures.profiles)for(const c of p.clips){
  assert.equal(c.license,'CC0-1.0');assert.ok(c.author);assert.ok(c.source.startsWith('https://freesound.org/'));
  const b=fs.readFileSync(path.join(root,c.path));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),c.sha256);
  assert.ok(c.duration>1&&c.duration<3.5);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),32000);assert.equal(b.readUInt16LE(34),16);
  const start=b.indexOf(Buffer.from('data'))+8;let peak=0,energy=0;
  for(let i=start;i+1<b.length;i+=2){const v=b.readInt16LE(i);peak=Math.max(peak,Math.abs(v));energy+=v*v;}
  assert.ok(peak>2500&&peak<=23201,c.id);assert.ok(Math.sqrt(energy/((b.length-start)/2))>500,c.id);
  assert.equal(b.readInt16LE(start),0);assert.equal(b.readInt16LE(b.length-2),0);
 }
});
test('All embedded candidates have consistent mono format, audible signal and click-free headroom',()=>{
 for(const p of bank.profiles)for(const c of p.clips){const b=fs.readFileSync(path.join(root,c.path));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),32000);assert.equal(b.readUInt16LE(34),16);const start=b.indexOf(Buffer.from('data'))+8;let peak=0,energy=0;for(let i=start;i+1<b.length;i+=2){const v=b.readInt16LE(i);peak=Math.max(peak,Math.abs(v));energy+=v*v;}assert.ok(peak>2500&&peak<=23201,c.id);assert.ok(Math.sqrt(energy/((b.length-start)/2))>250,c.id);assert.equal(b.readInt16LE(start),0);assert.equal(b.readInt16LE(b.length-2),0);}
});

test('Real CC0 dog growls are embedded with source credits, bounded peaks and natural playback rate',()=>{
 const growls=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/growl-bank/manifest.json')));assert.equal(growls.playbackRate,1);assert.equal(growls.profiles[0].author,'bonebrah');assert.equal(growls.profiles[0].license,'CC0-1.0');
 for(const c of growls.profiles[0].clips){const b=fs.readFileSync(path.join(root,c.path)),offset=b.indexOf(Buffer.from('data'))+8;assert.equal(crypto.createHash('sha256').update(b).digest('hex'),c.sha256);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),32000);assert.equal(b.readUInt16LE(34),16);let peak=0;for(let i=offset;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert.ok(peak>5000&&peak<=23201);assert.equal(b.readInt16LE(offset),0);assert.equal(b.readInt16LE(b.length-2),0);}
});
