const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),esbuild=require('esbuild'),root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const barkBank=JSON.parse(read('assets/audio/bark-bank/manifest.json'));
barkBank.creatures=JSON.parse(read('assets/audio/creature-bank/manifest.json')).profiles;
barkBank.growls=JSON.parse(read('assets/audio/growl-bank/manifest.json')).profiles;
barkBank.celebration={data:fs.readFileSync(path.join(root,'assets/audio/celebration/tuat-vuong.wav')).toString('base64')};
for(const profile of [...barkBank.profiles,...barkBank.creatures,...barkBank.growls])for(const clip of profile.clips)clip.data=fs.readFileSync(path.join(root,clip.path)).toString('base64');
const audio=read('src/live-barks.js').replace('__BARK_BANK__',JSON.stringify(barkBank));
const models=Object.fromEntries(['shiba','husky','pug','becgie','corgi','tiger'].map(id=>[id,zlib.gzipSync(fs.readFileSync(path.join(root,'assets/models/'+id+'.glb')),{level:9}).toString('base64')]));
const renderer=esbuild.buildSync({stdin:{contents:read('src/live-renderer-3d.js').replace('__MODEL_DATA__',JSON.stringify(models)),resolveDir:path.join(root,'src'),sourcefile:'live-renderer-3d.js',loader:'js'},bundle:true,format:'iife',platform:'browser',target:'chrome110',minify:true,write:false,legalComments:'inline'}).outputFiles[0].text;
const credits='/*! Embedded model sources: Quaternius (Ultimate Animated Animals, Zombie Apocalypse Kit) and Gobkit (Corgi, Tiger), CC0-1.0. Chinese dragon geometry original to this project. Three.js license follows:\n'+read('assets/licenses/three-LICENSE.txt')+'\n*/\n';
const realGifts=JSON.parse(read('assets/tiktok-gifts/manifest.json')).items.map(g=>({id:g.id,name:g.name,data:'data:image/webp;base64,'+fs.readFileSync(path.join(root,g.file)).toString('base64')}));
const giftArt=read('src/live-gift-art.js').replace('__REAL_GIFTS__',JSON.stringify(realGifts));
const common={'__CSS__':read('src/live.css'),'__ENGINE__':read('src/live-engine.js')+'\n'+read('src/live-bark-rhythm.js')+'\n'+giftArt+'\n'+audio+'\n'+read('src/live-ambience.js')+'\n'+read('src/live-audio-session.js')+'\n'+read('src/live-transport.js')+'\n'+read('src/live-broadcast.js'),'__CLIENT__':read('src/live-client.js'),'__RENDERER__':credits+renderer};
const out=path.join(root,'release/two-file-demo');fs.mkdirSync(out,{recursive:true});
for(const [template,file] of [['live-manager.template.html','index.html'],['live-overlay.template.html','overlay.html']]){
 let html=read('src/'+template);for(const [token,value] of Object.entries(common))html=html.replace(token,()=>value);
 if(/__(CSS|ENGINE|CLIENT|RENDERER|BARK_BANK)__/.test(html))throw new Error('Unresolved template token');
 fs.writeFileSync(path.join(root,file),html);fs.writeFileSync(path.join(out,file),html);console.log(file,Buffer.byteLength(html),'bytes');
}
