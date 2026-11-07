'use strict';
const {execFile}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'windows-speech.ps1'),'utf8');
function windowsSynthesize(text){
 if(process.platform!=='win32')return Promise.reject(new Error('Giọng dự phòng Windows chỉ dùng trên Windows.'));
 const value=String(text);if(!value.trim()||value.length>240)return Promise.reject(new Error('Lời đọc không hợp lệ.'));
 return new Promise((resolve,reject)=>{
  // Only this fixed program is executed. Names/text are JSON on stdin, never shell code.
  const exe=path.join(process.env.SystemRoot||'C:\\Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
  const child=execFile(exe,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:12000,maxBuffer:3*1024*1024,encoding:'utf8'},(error,stdout,stderr)=>{
   if(error){reject(new Error(error.killed?'Giọng Windows quá thời gian chờ.':'Giọng Windows: '+String(stderr||error.message).trim().slice(0,120)));return;}
   try{
    const result=JSON.parse(stdout.trim()),pcm=Buffer.from(result.pcm,'base64');if(result.sampleRate!==22050||pcm.length<2||pcm.length%2||pcm.length>2*1024*1024-44)throw new Error('PCM không hợp lệ.');
    const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(22050,24);header.writeUInt32LE(44100,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
    const audio=Buffer.concat([header,pcm]);audio.provider='windows';audio.voice=String(result.voice).slice(0,80);resolve(audio);
   }catch(e){reject(new Error('Giọng Windows: '+e.message));}
  });
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({text:value}),'utf8');
 });
}
module.exports={windowsSynthesize};
