'use strict';
const fs=require('node:fs'),path=require('node:path');
class Store{
 constructor(directory){this.directory=path.resolve(directory);fs.mkdirSync(this.directory,{recursive:true});this.file=path.join(this.directory,'session.json');this.lock=path.join(this.directory,'server.lock');this.locked=false;this.recovered=false;}
 acquire(){
  try{this.fd=fs.openSync(this.lock,'wx');}
  catch(e){
   if(e.code!=='EEXIST')throw e;
   let pid;try{pid=Number(fs.readFileSync(this.lock,'utf8'));}catch{}
   if(pid){try{process.kill(pid,0);throw new Error('Một Tuất Live khác đang dùng dữ liệu này.');}catch(e){if(e.code!=='ESRCH')throw e;}}
   else throw new Error('Không xác định được chủ khóa dữ liệu; cần kiểm tra server.lock.');
   fs.unlinkSync(this.lock);this.fd=fs.openSync(this.lock,'wx');
  }
  fs.writeSync(this.fd,String(process.pid));this.locked=true;
 }
 load(){
  let found=false;for(const f of [this.file,this.file+'.bak'])if(fs.existsSync(f)){
   found=true;try{const d=JSON.parse(fs.readFileSync(f,'utf8'));if(d.schema!==1||d.game?.version!==3||!Array.isArray(d.game.people)||!d.liveConfig||!d.receipts)throw new Error('Sai phiên bản');this.recovered=f.endsWith('.bak');return d;}catch{}
  }
  if(found)throw new Error('Dữ liệu chính và dự phòng không đọc được; giữ nguyên tệp để phục hồi.');return null;
 }
 save(document){
  const tmp=this.file+'.tmp',data=JSON.stringify(document),fd=fs.openSync(tmp,'w');
  try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  // Do not replace a healthy backup with the corrupt main file we just recovered from.
  if(fs.existsSync(this.file)&&!this.recovered)fs.copyFileSync(this.file,this.file+'.bak');
  fs.renameSync(tmp,this.file);this.recovered=false;
 }
 backup(document){const name='before-reset-'+Date.now()+'-'+require('node:crypto').randomUUID()+'.json',fd=fs.openSync(path.join(this.directory,name),'wx');try{fs.writeFileSync(fd,JSON.stringify(document));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return name;}
 close(){if(this.locked){fs.closeSync(this.fd);fs.unlinkSync(this.lock);this.locked=false;}}
}
module.exports={Store};
