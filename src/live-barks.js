(function(root){
 'use strict';
 const bank=__BARK_BANK__;
 const creatures=bank.creatures||[],growls=bank.growls||[],allProfiles=[...bank.profiles,...creatures,...growls];
 const REVISION='2026-11-07.1',{planBark}=root.TuatBarkRhythm;
 function stopSource(source,when){try{if(Number.isFinite(when)&&when>=0)source.stop(when);else source.stop();}catch(error){if(error.name!=='InvalidStateError')throw error;}}
 function tightenBarkBuffer(ctx,buffer){
  if(!ctx.createBuffer||!buffer.getChannelData||!Number.isFinite(buffer.sampleRate)||!Number.isFinite(buffer.length))return buffer;
  const rate=buffer.sampleRate,step=Math.max(1,Math.round(rate*.01)),channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)),quiet=[];
  for(let start=0;start<buffer.length;start+=step){let silent=true;for(const samples of channels){let energy=0,peak=0;const end=Math.min(buffer.length,start+step);for(let i=start;i<end;i++){energy+=samples[i]*samples[i];peak=Math.max(peak,Math.abs(samples[i]));}if(energy/(end-start)>=.003*.003||peak>=.012){silent=false;break;}}quiet.push(silent);}
  const first=quiet.findIndex(q=>!q);let last=quiet.length-1;while(last>=0&&quiet[last])last--;if(first<0)return buffer;
  const begin=Math.max(0,first*step-Math.round(rate*.02)),end=Math.min(buffer.length,(last+1)*step+Math.round(rate*.04)),segments=[];let cursor=begin;
  for(let i=first;i<=last;){if(!quiet[i]){i++;continue;}const from=i;while(i<=last&&quiet[i])i++;if((i-from)*step<rate*.18)continue;const keepEnd=from*step+Math.round(rate*.02),resume=i*step-Math.round(rate*.04);segments.push([cursor,keepEnd]);cursor=resume;}
  segments.push([cursor,end]);const length=segments.reduce((n,[a,b])=>n+b-a,0);if(length<=0||length>=buffer.length)return buffer;
  const result=ctx.createBuffer(buffer.numberOfChannels,length,rate);for(let channel=0;channel<channels.length;channel++){const output=result.getChannelData(channel);let offset=0;for(const [a,b]of segments){output.set(channels[channel].subarray(a,b),offset);offset+=b-a;}if(result.copyToChannel)result.copyToChannel(output,channel);}return result;
 }
 function speechLeadSeconds(buffer){
  if(typeof buffer.getChannelData!=='function'||!Number.isFinite(buffer.sampleRate))return 0;
  const samples=buffer.getChannelData(0),step=Math.max(1,Math.floor(buffer.sampleRate*.01)),limit=Math.min(samples.length,buffer.sampleRate*2);
  for(let i=0;i<limit;i+=step){let energy=0;const end=Math.min(limit,i+step);for(let j=i;j<end;j++)energy+=samples[j]*samples[j];if(energy/(end-i)>=.003*.003)return i/buffer.sampleRate;}
  return 0;
 }
 class TuatBarks{
  constructor(){this.ctx=null;this.buffers=new Map();this.loading=null;this.lastByVoice=new Map();this.lastGlobal=null;this.active=0;this.nextAt=0;this.played=0;this.last=null;this.previewIndex=0;this.sources=new Set();this.recent=[];this.creatureUntil=new Map();this.stopEpoch=0;this.speechEpoch=0;this.celebrations=0;this.actorBarks=new Map();this.lastGrowlAt=-Infinity;this.pendingBarks=new Map();this.giftSources=new Set();this.rhythms=new Map();}
  get profiles(){return bank.profiles.map(({id,label,source,author,clips})=>({id,label,source,author,count:clips.length}));}
  get creatureProfiles(){return creatures.map(({id,label,kind,clips})=>({id,label,kind,count:clips.length}));}
  async unlock({timeoutMs=1800}={}){
   if(!this.ctx||this.ctx.state==='closed'){const C=root.AudioContext||root.webkitAudioContext;if(!C)throw new Error('Trình duyệt chưa hỗ trợ âm thanh');this.ctx=new C();this.master=this.ctx.createGain();this.barkMaster=this.ctx.createGain();this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-5;this.limiter.knee.value=12;this.limiter.ratio.value=4;this.limiter.attack.value=.003;this.limiter.release.value=.14;this.master.connect(this.limiter);this.barkMaster.connect(this.limiter);this.limiter.connect(this.ctx.destination);this.ctx.onstatechange=()=>this.onStateChange?.();}
   if(this.ctx.state!=='running'){
    let timer;
    try{await Promise.race([this.ctx.resume(),new Promise((_,reject)=>{timer=setTimeout(()=>{const e=new Error('Chạm Bật tiếng để trình duyệt cho phép phát âm thanh.');e.code='AUDIO_GESTURE';reject(e);},timeoutMs);})]);}finally{clearTimeout(timer);}
    if(this.ctx.state!=='running'){const e=new Error('Chạm Bật tiếng để trình duyệt cho phép phát âm thanh.');e.code='AUDIO_GESTURE';throw e;}
   }
   if(!this.loading)this.loading=Promise.all(allProfiles.flatMap(p=>p.clips.map(async c=>{const bytes=Uint8Array.from(atob(c.data),x=>x.charCodeAt(0)),decoded=await this.ctx.decodeAudioData(bytes.buffer);this.buffers.set(c.id,bank.profiles.includes(p)?tightenBarkBuffer(this.ctx,decoded):decoded);}))).catch(e=>{this.loading=null;throw e;});
   await this.loading;
  }
  stop(){this.stopEpoch++;this.pendingBarks.clear();this.rhythms.clear();for(const source of this.giftSources){try{stopSource(source);}catch{}source.disconnect();}this.giftSources.clear();for(const source of [...this.sources]){try{stopSource(source);}finally{source.cleanup();}}this.stopSpeech();if(this.celebrationSource){const source=this.celebrationSource;try{stopSource(source);}finally{source.cleanup();}}this.nextAt=0;}
  stopSpeech(){this.speechEpoch++;if(this.speechSource){const source=this.speechSource;try{stopSource(source);}finally{source.cleanup(false);}}}
  async drainBarks(){
   if(this.draining)return;this.draining=true;const epoch=this.stopEpoch;
   try{while(this.active<4&&epoch===this.stopEpoch){const now=this.ctx?.currentTime||0;for(const [key,p]of this.pendingBarks)if(p.until<=now)this.pendingBarks.delete(key);const next=[...this.pendingBarks].filter(([key])=>![...this.sources].some(s=>s.actorKey===key)).sort((a,b)=>(b[1].options.priority||0)-(a[1].options.priority||0))[0];if(!next)break;this.pendingBarks.delete(next[0]);await this.play(next[1].options);}}catch{}finally{this.draining=false;if(epoch===this.stopEpoch)this.yieldForQueue(this.ctx?.currentTime||0);}
  }
  yieldForQueue(now){
   const waiting=[...this.pendingBarks].filter(([key,p])=>p.until>now&&![...this.sources].some(s=>s.actorKey===key));if(!waiting.length)return;
   const priority=Math.max(...waiting.map(([,p])=>p.options.priority||0)),source=[...this.sources].filter(s=>s.immediate&&!s.isCreature&&!Number.isFinite(s.yieldAt)&&Number.isFinite(s.barkDuration)&&s.barkDuration>0&&Number.isFinite(s.barkStartedAt)&&(s.priority||0)<=priority).sort((a,b)=>a.barkStartedAt-b.barkStartedAt)[0];if(!source)return;
   const boundary=source.barkStartedAt+(Math.floor(Math.max(0,now-source.barkStartedAt)/source.barkDuration)+1)*source.barkDuration;if(!Number.isFinite(boundary)||boundary<0)return;source.yieldAt=boundary;source.endAt=Math.min(Number.isFinite(source.endAt)?source.endAt:boundary,boundary);stopSource(source,source.endAt);
  }
  async celebrate(volume=65){
   if(!bank.celebration)return false;const epoch=this.stopEpoch;await this.unlock();if(epoch!==this.stopEpoch)return false;
   if(!this.celebrationLoading){const bytes=Uint8Array.from(atob(bank.celebration.data),c=>c.charCodeAt(0));this.celebrationLoading=this.ctx.decodeAudioData(bytes.buffer).catch(e=>{this.celebrationLoading=null;throw e;});}
   const buffer=await this.celebrationLoading;if(epoch!==this.stopEpoch||this.celebrationSource)return false;this.setVolume(volume);const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=.6;source.connect(gain);gain.connect(this.master);this.celebrationSource=source;this.celebrations++;source.cleanup=()=>{if(this.celebrationSource!==source)return;this.celebrationSource=null;source.disconnect();gain.disconnect();};source.onended=source.cleanup;source.start();return true;
  }
  setVolume(volume){this.volume=Math.min(100,Math.max(0,Number(volume)||0));this.master.gain.setTargetAtTime(this.volume/100*.85*(this.ducking?.28:1),this.ctx.currentTime,.025);this.barkMaster.gain.setTargetAtTime(this.volume/100*.85*(this.barkDucking?.28:1),this.ctx.currentTime,.025);}
  async speak(url,volume=65,{duckBarks=false,onStart=()=>{},onEnd=()=>{}}={}){
   if(!/^\/audio\/[a-f0-9-]{36}\.(mp3|wav)$/.test(url))throw new Error('Đường dẫn giọng đọc không hợp lệ.');
   const epoch=this.stopEpoch,speechEpoch=this.speechEpoch;await this.unlock();const response=await root.fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('Giọng đọc đã hết hạn.');
   const bytes=await response.arrayBuffer();if(bytes.byteLength>2*1024*1024)throw new Error('Giọng đọc quá lớn.');
   const buffer=await this.ctx.decodeAudioData(bytes);if(epoch!==this.stopEpoch||speechEpoch!==this.speechEpoch)return false;
   if(buffer.duration>35||buffer.duration<.01)throw new Error('Độ dài giọng đọc không hợp lệ.');
   return new Promise((resolve,reject)=>{
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.connect(gain);gain.connect(this.limiter);gain.gain.value=Math.min(100,Math.max(0,Number(volume)||0))/100*.9;
    this.speechSource=source;this.ducking=true;this.barkDucking=duckBarks===true;this.setVolume(volume);
    const lead=speechLeadSeconds(buffer);let notified=false,startTimer;
    const notify=()=>{if(this.speechSource!==source||epoch!==this.stopEpoch||speechEpoch!==this.speechEpoch)return;notified=true;try{onStart(Math.max(.01,buffer.duration-lead));}catch{}};
    source.cleanup=(completed=true)=>{if(this.speechSource!==source)return;clearTimeout(startTimer);this.speechSource=null;this.ducking=false;this.barkDucking=false;this.setVolume(this.volume);source.disconnect();gain.disconnect();if(notified)try{onEnd(completed);}catch{}resolve(completed);};source.onended=()=>source.cleanup(speechEpoch===this.speechEpoch&&epoch===this.stopEpoch);
    try{source.start();if(lead>0)startTimer=setTimeout(notify,lead*1000);else notify();}catch(e){source.cleanup(false);reject(e);}
   });
  }
  voiceFor(actor,form){if(creatures.some(p=>p.id===form))return form;const id=String(actor||'guest');let hash=2166136261;for(let i=0;i<id.length;i++){hash^=id.charCodeAt(i);hash=Math.imul(hash,16777619);}return bank.profiles[(hash>>>0)%bank.profiles.length].id;}
  choose(voice){const profile=allProfiles.find(p=>p.id===voice)||bank.profiles[0],candidates=profile.clips.filter(c=>c.id!==this.lastByVoice.get(profile.id)&&c.id!==this.lastGlobal),pool=candidates.length?candidates:profile.clips;const clip=pool[Math.floor(Math.random()*pool.length)];return{profile,clip};}
  async play({voice,actor,team,form,volume=65,preview=false,immediate=false,count:burstCount=1,priority=0,rhythm:queuedRhythm}={}){
   const stopEpoch=this.stopEpoch;await this.unlock();if(stopEpoch!==this.stopEpoch)return false;
   burstCount=Number.isFinite(burstCount)?Math.max(1,Math.min(100000,burstCount)):1;
   let id=voice||(creatures.some(p=>p.id===form)?form:preview?bank.profiles[this.previewIndex++%bank.profiles.length].id:this.voiceFor(actor,form));
   const isCreature=creatures.some(p=>p.id===id),key=String(actor||'guest')+':'+id,current=this.ctx.currentTime;
   if(immediate&&!isCreature){
    if(queuedRhythm&&queuedRhythm.until<=current*1000)return false;const rhythm=queuedRhythm||planBark(this.rhythms.get(key),current*1000,burstCount);this.rhythms.set(key,rhythm);if(this.rhythms.size>600)this.rhythms.delete(this.rhythms.keys().next().value);
    for(const source of [...this.sources])if(source.immediate&&source.endAt<=current)source.cleanup();
    const playing=[...this.sources].find(s=>s.actorKey===key);for(const [k,p]of this.pendingBarks)if(p.until<=current)this.pendingBarks.delete(k);
    if(playing){this.pendingBarks.delete(key);if(!this.pendingBarks.size)delete playing.yieldAt;if(!playing.isPreview&&!playing.isGrowl&&Number.isFinite(playing.barkDuration)&&playing.barkDuration>0&&Number.isFinite(playing.barkOffset)&&playing.barkOffset>=0&&(playing.immediate&&playing.loop||playing.barkStartedAt<=current)){playing.immediate=true;playing.loop=true;playing.loopStart=playing.barkOffset;playing.loopEnd=playing.buffer.duration;playing.rhythm=rhythm;if(this.sustainBark(playing,current,burstCount,true))return true;}playing.cancelled=true;stopSource(playing);playing.cleanup();}
    if(this.active>=4&&![...this.sources].some(s=>!s.isCreature&&!s.immediate)){this.pendingBarks.set(key,{until:rhythm.until/1000,options:{voice,actor,team,form,volume,immediate:true,count:burstCount,priority,rhythm}});if(this.pendingBarks.size>128)this.pendingBarks.delete(this.pendingBarks.keys().next().value);this.yieldForQueue(current);}
   }else if(!preview&&!isCreature&&[...this.sources].some(s=>s.actorKey===key&&s.immediate&&s.endAt>current))return true;
   if(!preview&&isCreature&&(this.creatureUntil.get(key)||0)>current)return false;
   if(preview)for(const source of [...this.sources])if(source.isPreview){stopSource(source);source.cleanup();}
   if(preview&&this.active>=3){const source=this.sources.values().next().value;stopSource(source);source.cleanup();}
   if(isCreature&&this.active>=3){const dog=[...this.sources].find(s=>!s.isCreature);if(dog){dog.cancelled=true;stopSource(dog);dog.cleanup();}}
   if(immediate&&this.active>=4||isCreature&&this.active>=3){const old=[...this.sources].find(s=>!s.isCreature&&!s.immediate)||(isCreature?[...this.sources].find(s=>!s.isCreature):null);if(old){old.cancelled=true;stopSource(old);old.cleanup();}}
   if(immediate&&!isCreature&&this.active>=4)return true;
   if(this.active>=(immediate?4:3))return false;
   const at=preview||immediate||isCreature?current+.005:Math.max(current+.01,this.nextAt);
   if(!immediate&&at-current>.55)return false;
   const normal=!preview&&!voice&&!isCreature,actorKey=String(actor||'guest'),count=(this.actorBarks.get(actorKey)||0)+1,autoGrowl=normal&&!immediate&&growls.length>0&&count%4===0&&current-this.lastGrowlAt>=4;
   if(normal){this.actorBarks.set(actorKey,count);if(this.actorBarks.size>600)this.actorBarks.delete(this.actorBarks.keys().next().value);}if(autoGrowl){id=growls[0].id;this.lastGrowlAt=current;}
   const chosen=autoGrowl?{profile:growls[0],clip:growls[0].clips.find(c=>c.id==='bark-growl')||growls[0].clips[0]}:this.choose(id),{profile,clip}=chosen,buffer=this.buffers.get(clip.id),source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
   this.setVolume(volume);
   const offset=speechLeadSeconds(buffer),duration=Math.max(.01,buffer.duration-offset);
   source.buffer=buffer;source.playbackRate.value=1;gain.gain.value=isCreature?.78:.9;source.connect(gain);
   let pan;if(this.ctx.createStereoPanner){pan=this.ctx.createStereoPanner();pan.pan.value=team==='left'?-.18:team==='right'?.18:0;gain.connect(pan);pan.connect(this.barkMaster);}else gain.connect(this.barkMaster);
   this.active++;if(!immediate)this.nextAt=at+.17;if(isCreature&&!preview)this.creatureUntil.set(key,at+buffer.duration+.1);this.lastByVoice.set(profile.id,clip.id);this.lastGlobal=clip.id;this.last={voice:profile.id,label:profile.label,sample:clip.id,vocal:profile.id==='growl'?'growl':'bark',form:isCreature?id:'dog',duration,actor:actor||null,playbackRate:1};this.played++;this.recent.push({...this.last});this.recent=this.recent.slice(-12);
   source.immediate=immediate;source.priority=priority;source.actorKey=key;source.isGrowl=profile.id==='growl';source.barkStartedAt=at;source.barkDuration=duration;source.barkOffset=offset;source.endAt=at+duration;source.rhythm=this.rhythms.get(key);source.isPreview=preview;source.isCreature=isCreature;this.sources.add(source);source.cleanup=()=>{if(this.sources.delete(source)){this.active--;source.disconnect();gain.disconnect();pan?.disconnect();const pending=this.pendingBarks.get(key);if(immediate){this.pendingBarks.delete(key);if(!source.cancelled&&stopEpoch===this.stopEpoch&&pending?.until>this.ctx.currentTime)this.pendingBarks.set(key,pending);}if(stopEpoch===this.stopEpoch)this.drainBarks();}};source.onended=source.cleanup;if(immediate&&!isCreature&&!preview){source.loop=true;source.loopStart=offset;source.loopEnd=buffer.duration;source.barkStartedAt=at;source.barkDuration=duration;source.endAt=at+duration;source.start(at,offset);this.sustainBark(source,at,burstCount,false);}else source.start(at,offset);return true;
  }
  sustainBark(source,now,count,followup){
   // Extend the same full, unpitched recording on the audio clock. Never wait
   // for a JavaScript onended callback between consecutive hearts.
   const duration=source.barkDuration,start=source.barkStartedAt;if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(start)||start<0||!Number.isFinite(now)||now<0)return false;
   const safeCount=Number.isFinite(count)?Math.max(1,Math.min(100000,count)):1,rhythm=source.rhythm||planBark(null,now*1000,safeCount),until=rhythm.until/1000,cycles=!followup&&safeCount===1&&!rhythm.continuing?1:Math.max(1,Math.ceil((until-start)/duration)),previous=Number.isFinite(source.endAt)?source.endAt:start+duration,endAt=Math.min(Number.isFinite(source.yieldAt)?source.yieldAt:Infinity,Math.max(previous,start+cycles*duration));
   if(!Number.isFinite(endAt)||endAt<0)return false;source.endAt=endAt;stopSource(source,endAt);return true;
  }
  async giftCue(kind,volume=65,{team,applied=true}={}){
   const epoch=this.stopEpoch;await this.unlock();if(epoch!==this.stopEpoch||!this.ctx.createOscillator)return false;const sets=!applied?[523]:{rose:[523,659,784],cake:[523,659,784],heal:[659,880],revive:[392,523,659,1047],tiger:[220,330,440],dragon:[262,392,523,784],execute:[392,587,880]},notes=Array.isArray(sets)?sets:sets[kind]||[523,784],gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner?.();gain.gain.value=0;gain.connect(pan||this.master);if(pan){pan.pan.value=team==='left'?-.18:team==='right'?.18:0;pan.connect(this.master);}this.setVolume(volume);const at=this.ctx.currentTime+.005;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.14,at+.025);gain.gain.exponentialRampToValueAtTime(.001,at+notes.length*.075+.3);
   let remaining=notes.length;for(const [i,note]of notes.entries()){const source=this.ctx.createOscillator();source.type='sine';source.frequency.value=note;source.connect(gain);this.giftSources.add(source);source.onended=()=>{this.giftSources.delete(source);source.disconnect();if(!--remaining){gain.disconnect();pan?.disconnect();}};source.start(at+i*.075);stopSource(source,at+i*.075+.3);}return true;
  }
  info(){return{revision:REVISION,decoded:this.buffers.size===allProfiles.reduce((n,p)=>n+p.clips.length,0),voices:bank.profiles.length,samples:bank.profiles.reduce((n,p)=>n+p.clips.length,0),creatureVoices:creatures.length,creatureSamples:creatures.reduce((n,p)=>n+p.clips.length,0),growlSamples:growls.reduce((n,p)=>n+p.clips.length,0),totalSamples:allProfiles.reduce((n,p)=>n+p.clips.length,0),played:this.played,active:this.active,contextState:this.ctx?.state||'not-created',playbackRate:1,duration:this.last?.duration,last:this.last,recent:this.recent};}
 }
 TuatBarks.REVISION=REVISION;TuatBarks.tightenBarkBuffer=tightenBarkBuffer;root.TuatBarks=TuatBarks;
})(window);

