const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json')));
test('All source files match their recorded hashes and allow commercial reuse',()=>{
 assert.equal(manifest.assets.length,9);
 for(const a of manifest.assets){const b=fs.readFileSync(path.join(root,a.path));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256,a.id);assert.equal(a.license,'CC0-1.0');assert.match(a.source,/^https:\/\//);}
});
test('Every GLB is self-contained, skinned, and has usable attack/death/movement clips',()=>{
 for(const a of manifest.assets.filter(a=>a.path.endsWith('.glb'))){
  const b=fs.readFileSync(path.join(root,a.path));assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
  const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.ok(j.skins.length>0,a.id);assert.ok(j.animations.length>=4,a.id);
  const names=j.animations.map(a=>a.name.toLowerCase());assert.ok(names.some(n=>/attack|bite|headbutt/.test(n)),a.id);assert.ok(names.some(n=>/death|dead/.test(n)),a.id);assert.ok(names.some(n=>/walk|flying/.test(n)),a.id);
  for(const buffer of j.buffers)assert.ok(!buffer.uri,a.id+' external buffer');
  for(const image of j.images||[])assert.ok(!image.uri||image.uri.startsWith('data:'),a.id+' external texture');
 }
});
test('Processed barks have headroom, mono PCM and click-free endpoints',()=>{
 const processing=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/processing.json')));
 for(const p of processing){const b=fs.readFileSync(path.join(root,p.path));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),p.sha256);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt16LE(34),16);const start=b.indexOf(Buffer.from('data'))+8;let peak=0;for(let i=start;i+1<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert.ok(peak<24000&&peak>20000);assert.ok(Math.abs(b.readInt16LE(start))<5);assert.ok(Math.abs(b.readInt16LE(b.length-2))<5);}
});
