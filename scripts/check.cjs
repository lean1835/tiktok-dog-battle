'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawnSync}=require('node:child_process'),root=path.resolve(__dirname,'..');
let count=0;
for(const dir of ['src','server','scripts'])for(const file of fs.readdirSync(path.join(root,dir)).filter(f=>/\.(c?js|mjs)$/.test(f))){const result=spawnSync(process.execPath,['--check',path.join(root,dir,file)],{encoding:'utf8'});if(result.status!==0){process.stderr.write(result.stderr);process.exit(1);}count++;}
for(const file of ['index.html','overlay.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');for(const [,script]of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script,{filename:file});
 const markup=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,'');
 const ids=[...markup.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw new Error('Trùng ID trong '+file);
 if(/__(CSS|ENGINE|CLIENT|RENDERER|BARK_BANK)__/.test(html))throw new Error('Còn token chưa build trong '+file);
}
console.log(`Syntax verified: ${count} modules + scripts embedded in both HTML files.`);
