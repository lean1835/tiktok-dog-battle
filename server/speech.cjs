'use strict';
// Vietnamese Edge Read Aloud queue, adapted from Chánh Điện's MIT server.
const {EventEmitter}=require('node:events'),{randomUUID}=require('node:crypto');
const {windowsSynthesize}=require('./windows-speech.cjs');
const {prepareSpeechText}=require('./pronunciation.cjs');
const escape=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
async function edgeSynthesize(text,voice){
 const {MsEdgeTTS,OUTPUT_FORMAT}=require('msedge-tts'),tts=new MsEdgeTTS({connectionTimeoutMs:8000,synthesisTimeoutMs:12000});
 let timer;
 try{
  return await Promise.race([(async()=>{
   await tts.setMetadata(voice,OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
   const {audioStream}=tts.toStream(escape(text)),chunks=[];let bytes=0;
   await new Promise((resolve,reject)=>{let ended=false;audioStream.on('data',chunk=>{bytes+=chunk.length;if(bytes>2*1024*1024){reject(new Error('Giọng đọc vượt dung lượng.'));tts.close();}else chunks.push(chunk);});audioStream.once('error',reject);audioStream.once('end',()=>{ended=true;resolve();});audioStream.once('close',()=>{if(!ended)reject(new Error('Giọng đọc bị ngắt trước khi hoàn tất.'));});});
   if(!bytes)throw new Error('Giọng đọc rỗng.');return Buffer.concat(chunks);
  })(),new Promise((_,reject)=>timer=setTimeout(()=>{tts.close();reject(new Error('Giọng đọc quá thời gian chờ.'));},20000))]);
 }finally{clearTimeout(timer);try{tts.close();}catch{}}
}
function createSpeechProvider({edge=edgeSynthesize,windows=windowsSynthesize,now=()=>Date.now(),cooldownMs=60000}={}){
 let retryAt=0,provider='',voiceName='',warning='',fallback=false;
 const synth=async(text,voice)=>{
  if(voice==='windows-vi'){const audio=await windows(text);provider='windows';voiceName=audio.voice||'Tiếng Việt';warning='';fallback=false;return audio;}
  let edgeError;
  if(now()>=retryAt){try{const audio=await edge(text,voice);retryAt=0;provider='edge';voiceName=voice;warning='';fallback=false;return audio;}catch(e){edgeError=e;retryAt=now()+cooldownMs;warning=String(e.message).slice(0,160);}}
  try{const audio=await windows(text);provider='windows';voiceName=audio.voice||'Tiếng Việt';fallback=true;return audio;}
  catch(e){provider='';throw new Error((edgeError?'Edge: '+edgeError.message+'; ':'')+e.message);}
 };
 synth.info=()=>({provider,voice:voiceName,retryAt,warning,fallback});return synth;
}
const synthesize=createSpeechProvider();
class Speech extends EventEmitter{
 constructor({synth,now=()=>Date.now()}={}){super();Object.assign(this,{synth:synth||createSpeechProvider({now}),now});this.queue=[];this.cache=new Map();this.prepared=new Map();this.busy=false;this.epoch=0;this.error='';this.skipped=0;}
 prepare(text,{voice='vi-VN-NamMinhNeural',pronunciations=[]}={}){
  const spoken=prepareSpeechText(String(text).slice(0,240),{rules:pronunciations}),key=voice+'|'+spoken;
  if(!this.prepared.has(key)){const promise=Promise.resolve().then(()=>this.synth(spoken,voice)).catch(e=>{this.prepared.delete(key);throw e;});this.prepared.set(key,promise);while(this.prepared.size>8)this.prepared.delete(this.prepared.keys().next().value);promise.catch(()=>{});}return this.prepared.get(key);
 }
 enqueue(text,{voice='vi-VN-NamMinhNeural',priority=0,fallback='',pronunciations=[],protectedTexts=[],honorId,welcome,presentation,roundPhase}={}){
  if(priority>=3){const interrupted=this.job?.item;this.epoch++;this.queue=this.queue.filter(item=>item.priority>0);if(interrupted?.priority>0&&interrupted.priority<3)this.queue.unshift(interrupted);this.queue=this.queue.slice(0,14);this.job=null;this.busy=false;}
  else if(priority>0&&this.job&&this.job.item.priority<priority){const interrupted=this.job.item;if(interrupted.priority>0)this.queue.unshift(interrupted);this.epoch++;this.job=null;this.busy=false;}
  if(this.queue.length>=15){if(priority>0){const index=this.queue.findIndex(x=>x.priority===0);if(index>=0)this.queue.splice(index,1);else{this.skipped++;return false;}}else{this.skipped++;return false;}}
  const options={rules:pronunciations,protectedTexts},original=String(text).slice(0,240);this.queue.push({text:original,spokenText:prepareSpeechText(original,options),voice,priority,honorId,welcome,presentation,roundPhase,fallback:prepareSpeechText(String(fallback).slice(0,120),options),at:this.now()});this.queue.sort((a,b)=>b.priority-a.priority);this.emit('state');this.pump();return true;
 }
 async pump(){
  if(this.busy||!this.queue.length)return;const item=this.queue.shift(),epoch=this.epoch;
  if(this.now()-item.at>30000){this.skipped++;queueMicrotask(()=>this.pump());return;}
  const job={item};this.job=job;this.busy=true;this.emit('state');
  try{let audio,spokenText=item.spokenText;
   try{audio=await (this.prepared.get(item.voice+'|'+spokenText)||this.synth(spokenText,item.voice));}catch(first){if(!item.fallback||epoch!==this.epoch)throw first;this.emit('warning','Giọng đọc câu dài lỗi; đang thử lời ngắn.');spokenText=item.fallback;audio=await this.synth(item.fallback,item.voice);}
   if(epoch!==this.epoch)return;
   const id=randomUUID(),wav=audio.toString('ascii',0,4)==='RIFF';this.cache.set(id,{audio,wav,at:this.now()});for(const [key,value]of this.cache)if(this.cache.size>40||this.now()-value.at>300000)this.cache.delete(key);
   this.error='';this.emit('ready',{id,url:'/audio/'+id+(wav?'.wav':'.mp3'),text:item.text,spokenText,priority:item.priority,honorId:item.honorId,welcome:item.welcome,presentation:item.presentation,roundPhase:item.roundPhase,provider:audio.provider||'edge',at:this.now()});
  }catch(e){if(epoch===this.epoch){this.error=String(e.message).slice(0,160);this.emit('warning',this.error);}}
  finally{if(this.job===job){this.job=null;this.busy=false;this.emit('state');this.pump();}}
 }
 get(id,extension){const entry=this.cache.get(id);return entry&&this.now()-entry.at<300000&&(!extension||extension===(entry.wav?'wav':'mp3'))?entry.audio:null;}
 clear(){this.epoch++;this.queue=[];this.job=null;this.busy=false;this.emit('state');}
 info(){return{pending:this.queue.length,busy:this.busy,error:this.error,skipped:this.skipped,...this.synth.info?.()};}
}
module.exports={Speech,synthesize,edgeSynthesize,createSpeechProvider};
