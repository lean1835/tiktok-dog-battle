'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),out=path.join(root,'release/live-app');
fs.mkdirSync(out,{recursive:true});
// Explicit copies: never include credentials, session data or the development browser profile.
const files=['index.html','overlay.html','Start-Tuat.cmd','Chay-Tuat-Live.bat','Mo-San-Doc.bat','package.json','package-lock.json','README.md','src/live-engine.js','src/live-broadcast.js','scripts/serve.cjs','scripts/launch.cjs','scripts/open-overlay.cjs','scripts/lock-portrait-window.ps1',...fs.readdirSync(path.join(root,'server')).filter(f=>/\.(cjs|ps1)$/.test(f)).map(f=>'server/'+f),'assets/licenses/chanh-dien-MIT.txt','assets/licenses/three-LICENSE.txt',...fs.readdirSync(path.join(root,'assets/tiktok-gifts')).filter(f=>/\.webp$/.test(f)||['manifest.json','ATTRIBUTION.md'].includes(f)).map(f=>'assets/tiktok-gifts/'+f),...fs.readdirSync(path.join(root,'docs')).filter(f=>f.endsWith('.md')).map(f=>'docs/'+f)];
for(const file of files){const target=path.join(out,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
const pkg=JSON.parse(fs.readFileSync(path.join(out,'package.json'),'utf8'));pkg.scripts={start:'node scripts/launch.cjs',serve:'node scripts/serve.cjs'};fs.writeFileSync(path.join(out,'package.json'),JSON.stringify(pkg,null,2)+'\n');
for(const file of ['node_modules/tiktok-live-connector/dist/LICENSE','node_modules/ws/LICENSE','node_modules/msedge-tts/LICENSE'])if(fs.existsSync(path.join(root,file))){const name='assets/licenses/'+file.split('/')[1]+'-LICENSE.txt';fs.copyFileSync(path.join(root,file),path.join(out,name));files.push(name);}
fs.writeFileSync(path.join(out,'package-files.json'),JSON.stringify([...new Set(files)],null,2));
console.log('Prepared portable runtime at '+out+' (no user data or signing keys).');



