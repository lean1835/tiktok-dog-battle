const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/bark-bank/manifest.json')));
function create({resumeBlocked=false}={}){
 const bank=JSON.parse(JSON.stringify(manifest));bank.creatures=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/creature-bank/manifest.json'))).profiles;bank.growls=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/growl-bank/manifest.json'))).profiles;for(const p of [...bank.profiles,...bank.creatures,...bank.growls])for(const c of p.clips)c.data=fs.readFileSync(path.join(root,c.path)).toString('base64');
 bank.celebration={data:fs.readFileSync(path.join(root,'assets/audio/celebration/tuat-vuong.wav')).toString('base64')};
 const sources=[];let decoded=0;
 class AudioContext{
  constructor(){this.currentTime=0;this.state='suspended';this.destination={};}
  async resume(){if(resumeBlocked)return new Promise(()=>{});this.state='running';}
  async decodeAudioData(data){decoded++;const b=Buffer.from(data);return{duration:(b.length-b.indexOf(Buffer.from('data'))-8)/b.readUInt32LE(24)/2};}
  createGain(){return{gain:{value:1,setTargetAtTime(value){this.value=value;}},connect(){},disconnect(){}};}
  createDynamicsCompressor(){return{threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){}};}
  createStereoPanner(){return{pan:{value:0},connect(){},disconnect(){}};}
  createBufferSource(){const ctx=this,source={playbackRate:{value:0},connect(){},disconnect(){},start(at,offset,duration){this.at=at;this.offset=offset;this.duration=duration;},stop(when){if(when!==undefined&&!Number.isFinite(when))throw new TypeError("Failed to execute 'stop' on 'AudioScheduledSourceNode': The provided double value is non-finite.");this.stopAt=when;if(when===undefined||when<=ctx.currentTime)this.onended?.();}};sources.push(source);return source;}
 }
 const window={AudioContext,TuatBarkRhythm:require('../src/live-bark-rhythm.js')},sandbox={window,setTimeout,clearTimeout,atob:s=>Buffer.from(s,'base64').toString('binary')};
 vm.runInNewContext(fs.readFileSync(path.join(root,'src/live-barks.js'),'utf8').replace('__BARK_BANK__',JSON.stringify(bank)),sandbox);
 return{audio:new window.TuatBarks(),sources,decoded:()=>decoded,window};
}
test('All 20 dog, creature and growl samples decode once even when two actors request sound together',async()=>{
 const t=create();await Promise.all([t.audio.unlock(),t.audio.unlock()]);assert.equal(t.decoded(),20);assert.equal(t.audio.info().decoded,true);assert.equal(t.audio.info().voices,6);assert.equal(t.audio.info().samples,15);assert.equal(t.audio.info().creatureVoices,2);assert.equal(t.audio.info().creatureSamples,3);assert.equal(t.audio.info().contextState,'running');
});

test('The original celebration sting decodes once, never overlaps itself and mute stops it',async()=>{
 const t=create();await t.audio.unlock();const result=await Promise.all([t.audio.celebrate(65),t.audio.celebrate(65)]);assert.equal(result.filter(Boolean).length,1);assert.equal(t.decoded(),21);assert.ok(t.audio.celebrationSource);assert.equal(t.audio.info().active,0);t.audio.stop();assert.equal(t.audio.celebrationSource,null);await t.audio.celebrate(65);assert.equal(t.decoded(),21);t.audio.stop();
});

test('Honor narration can stop a previous voice without cutting the fanfare, which ducks under speech',async()=>{
 const t=create();await t.audio.celebrate(65);const sting=t.audio.celebrationSource,sample=fs.readFileSync(path.join(root,manifest.profiles[0].clips[0].path));t.window.fetch=async()=>({ok:true,arrayBuffer:async()=>sample.buffer.slice(sample.byteOffset,sample.byteOffset+sample.byteLength)});const speech=t.audio.speak('/audio/12345678-1234-1234-1234-123456789012.wav',65);await new Promise(r=>setImmediate(r));assert.equal(t.audio.ducking,true);assert.ok(t.audio.master.gain.value<.2);t.audio.stopSpeech();assert.equal(await speech,false);assert.equal(t.audio.celebrationSource,sting);assert.equal(t.audio.ducking,false);t.audio.stop();
});

test('Blocked autoplay reports a user gesture requirement instead of hanging forever',async()=>{
 const {audio}=create({resumeBlocked:true});await assert.rejects(audio.unlock({timeoutMs:10}),{code:'AUDIO_GESTURE'});assert.equal(audio.ctx.state,'suspended');assert.equal(audio.info().played,0);
});

test('Mute stops current sources and cancels playback still awaiting decode',async()=>{
 const {audio}=create();await audio.play({voice:'dragon',preview:true});assert.equal(audio.info().active,1);audio.stop();assert.equal(audio.info().active,0);
 let release;audio.unlock=()=>new Promise(resolve=>{release=resolve;});const pending=audio.play({actor:'pending'});audio.stop();release();assert.equal(await pending,false);assert.equal(audio.info().active,0);
});

test('Gift narration ducks barks in the same unlocked context and mute stops both audio paths',async()=>{
 const {audio,sources,window}=create();await audio.unlock();
 const sample=fs.readFileSync(path.join(root,manifest.profiles[0].clips[0].path));
 window.fetch=async()=>({ok:true,arrayBuffer:async()=>sample.buffer.slice(sample.byteOffset,sample.byteOffset+sample.byteLength)});
 await assert.rejects(audio.speak('https://evil.test/audio.mp3'),/không hợp lệ/);
 const speech=audio.speak('/audio/12345678-1234-1234-1234-123456789012.mp3',65,{duckBarks:true});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(audio.ducking,true);assert.equal(audio.barkDucking,true);assert.ok(audio.speechSource);await audio.play({actor:'a',volume:65});assert.ok(Math.abs(audio.barkMaster.gain.value-.65*.85*.28)<1e-9);
 audio.stop();await speech;assert.equal(audio.ducking,false);assert.equal(audio.speechSource,null);assert.equal(audio.info().active,0);assert.equal(sources.length,2);
});

test('Welcomes keep ongoing and new competitive barks at full volume; only gift speech lowers their bus',async()=>{
 const {audio,sources,window}=create();await audio.play({actor:'fighter',volume:65,immediate:true,count:20});const dog=sources.at(-1),sample=fs.readFileSync(path.join(root,manifest.profiles[0].clips[0].path)),url='/audio/12345678-1234-1234-1234-123456789012.wav',full=audio.barkMaster.gain.value,voice=audio.info().last.voice;
 window.fetch=async()=>({ok:true,arrayBuffer:async()=>sample.buffer.slice(sample.byteOffset,sample.byteOffset+sample.byteLength)});
 const welcome=audio.speak(url,65,{duckBarks:false});await new Promise(setImmediate);assert.equal(audio.ducking,true,'music and fanfare retain narration ducking');assert.equal(audio.barkDucking,false);assert.equal(audio.barkMaster.gain.value,full);assert.ok(audio.sources.has(dog));await audio.play({actor:'fighter',volume:65,immediate:true,count:20});assert.ok(audio.sources.has(dog));assert.equal(audio.info().last.voice,voice);assert.equal(audio.barkMaster.gain.value,full);audio.stopSpeech();assert.equal(await welcome,false);
 const gift=audio.speak(url,65,{duckBarks:true});await new Promise(setImmediate);assert.ok(Math.abs(audio.barkMaster.gain.value-full*.28)<1e-9);assert.ok(audio.sources.has(dog));audio.stopSpeech();assert.equal(await gift,false);assert.equal(audio.barkMaster.gain.value,full);assert.equal(audio.barkDucking,false);audio.stop();
});

test('Speech camera hooks fire only after the source starts and end exactly once on mute',async()=>{
 const {audio,window}=create();await audio.unlock();const sample=fs.readFileSync(path.join(root,manifest.profiles[0].clips[0].path)),events=[];let release;
 window.fetch=()=>new Promise(resolve=>release=()=>resolve({ok:true,arrayBuffer:async()=>sample.buffer.slice(sample.byteOffset,sample.byteOffset+sample.byteLength)}));
 const pending=audio.speak('/audio/12345678-1234-1234-1234-123456789012.wav',65,{onStart:duration=>{assert.ok(audio.speechSource);events.push(['start',duration]);},onEnd:completed=>events.push(['end',completed])});await new Promise(resolve=>setImmediate(resolve));assert.equal(events.length,0,'fetching/decoding must not zoom early');release();await new Promise(resolve=>setImmediate(resolve));assert.equal(events[0][0],'start');assert.ok(events[0][1]>0);
 audio.stop();assert.equal(await pending,false);assert.equal(events.length,2);assert.deepEqual(events[1],['end',false]);audio.stop();assert.equal(events.length,2);
});

test('Camera start follows the first audible speech frame instead of leading silence, and mute cancels a pending cue',async()=>{
 const {audio,window}=create();await audio.unlock();window.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
 const samples=new Float32Array(500);samples.fill(.1,130);audio.ctx.decodeAudioData=async()=>({duration:.5,sampleRate:1000,getChannelData:()=>samples});const cues=[];
 const speech=audio.speak('/audio/12345678-1234-1234-1234-123456789012.wav',65,{onStart:duration=>cues.push(duration)});await new Promise(r=>setImmediate(r));assert.ok(audio.speechSource);assert.equal(cues.length,0,'starting a buffer with silence must not move the camera');await new Promise(r=>setTimeout(r,160));assert.equal(cues.length,1);assert.ok(Math.abs(cues[0]-.37)<.001);audio.stop();assert.equal(await speech,false);
 const next=audio.speak('/audio/12345678-1234-1234-1234-123456789012.wav',65,{onStart:()=>cues.push('stale')});await new Promise(r=>setImmediate(r));audio.stop();await next;await new Promise(r=>setTimeout(r,160));assert.equal(cues.length,1,'mute before the first syllable must not leave a late camera callback');
});

test('Windows fallback WAV narration uses the same audio output and mute path as Edge MP3',async()=>{
 const {audio,window}=create();await audio.unlock();const sample=fs.readFileSync(path.join(root,manifest.profiles[0].clips[0].path));let requested;
 window.fetch=async url=>{requested=url;return{ok:true,arrayBuffer:async()=>sample.buffer.slice(sample.byteOffset,sample.byteOffset+sample.byteLength)};};
 const url='/audio/12345678-1234-1234-1234-123456789012.wav',pending=audio.speak(url,65);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(requested,url);assert.equal(audio.ducking,true);assert.ok(audio.speechSource);audio.stop();assert.equal(await pending,false);assert.equal(audio.ducking,false);assert.equal(audio.speechSource,null);
 await assert.rejects(audio.speak(url+'?redirect=https://evil.test'),/không hợp lệ/);
});

test('Transformations use their own voices and returning to dog restores the same bark',async()=>{
 const {audio,sources}=create(),dog=audio.voiceFor('viewer-A');
 for(const form of ['tiger','dragon','dog']){
  assert.equal(await audio.play({actor:'viewer-A',form}),true);
  assert.equal(audio.info().last.voice,form==='dog'?dog:form);
  sources.at(-1).onended();audio.ctx.currentTime+=4;
 }
 assert.ok(sources.every(s=>s.playbackRate.value===1));
});

test('A roar takes a dog voice slot, respects polyphony and cannot overlap itself for the same actor',async()=>{
 const {audio,sources}=create();
 for(const actor of ['a','b','c'])await audio.play({actor});
 assert.equal(await audio.play({actor:'dragon-A',form:'dragon'}),true);
 assert.equal(audio.info().last.voice,'dragon');assert.equal(audio.info().active,3);
 assert.equal(await audio.play({actor:'dragon-A',form:'dragon'}),false);
 const first=audio.info().last.sample;sources.forEach(s=>s.onended?.());audio.ctx.currentTime=4;
 assert.equal(await audio.play({actor:'dragon-A',form:'dragon'}),true);
 assert.notEqual(audio.info().last.sample,first);
 // Preview deliberately bypasses the battle cooldown and replaces the prior preview.
 await audio.play({voice:'tiger',preview:true});await audio.play({voice:'dragon',preview:true});
 assert.equal(audio.info().last.voice,'dragon');assert.ok(audio.info().active<=3);
});
test('Each voice preview alternates actual samples without pitching or accumulating overlapping previews',async()=>{
 const {audio,sources}=create();const played=new Set();for(const voice of audio.profiles){await audio.play({voice:voice.id,preview:true});const first=audio.info().last.sample;await audio.play({voice:voice.id,preview:true});assert.notEqual(first,audio.info().last.sample,voice.id);played.add(audio.info().last.voice);assert.equal(audio.info().active,1);}
 assert.equal(played.size,6);assert.ok(sources.every(s=>s.playbackRate.value===1));
});
test('A tuat retains its voice; opposite sides can both bark with a short gap and bounded polyphony',async()=>{
 const {audio,sources}=create();const voice=audio.voiceFor('viewer-A');assert.equal(audio.voiceFor('viewer-A'),voice);
 assert.equal(await audio.play({actor:'viewer-A',team:'left'}),true);assert.equal(await audio.play({actor:'viewer-B',team:'right'}),true);assert.ok(Math.abs(sources[1].at-sources[0].at-.17)<1e-8);
 assert.equal(await audio.play({actor:'viewer-C'}),true);assert.equal(await audio.play({actor:'viewer-D'}),false);assert.equal(audio.info().active,3);
 sources.forEach(s=>s.onended?.());assert.equal(audio.info().active,0);
 const before=audio.info().recent.find(x=>x.actor==='viewer-A');audio.ctx.currentTime=2;await audio.play({actor:'viewer-A'});assert.equal(audio.info().last.voice,before.voice);assert.notEqual(audio.info().last.sample,before.sample);
});

test('Real growls alternate with normal barks, stay globally spaced, respect mute and never pitch recordings',async()=>{
 const {audio,sources}=create();let growls=0;
 for(let i=0;i<8;i++){audio.ctx&&(audio.ctx.currentTime=i*2);assert.equal(await audio.play({actor:'angry-dog'}),true);if(audio.info().last.vocal==='growl'){growls++;assert.equal(audio.info().last.sample,'bark-growl');}sources.at(-1).onended();}
 assert.equal(growls,2);assert.equal(audio.info().growlSamples,2);assert.ok(sources.every(s=>s.playbackRate.value===1));for(const actor of ['x','y','z'])await audio.play({actor});assert.equal(audio.info().active,3);assert.equal(await audio.play({voice:'growl',preview:true}),true);assert.equal(audio.info().last.vocal,'growl');assert.equal(audio.info().active,3);audio.stop();assert.equal(audio.info().active,0);
});


test('Interactive barks bypass bots and continuous hearts extend the same complete recording without JavaScript gaps',async()=>{
 const t=create();for(const actor of ['auto1','auto2','auto3'])await t.audio.play({actor});const before=t.sources.length;await t.audio.play({actor:'heart',immediate:true,count:1});const first=t.sources.at(-1);assert.equal(t.sources.length,before+1);assert.ok(first.at<.02);
 const buffer=first.buffer,voice=t.audio.last.voice,duration=buffer.duration-first.offset;t.audio.ctx.currentTime=.1;for(let i=0;i<20;i++)await t.audio.play({actor:'heart',immediate:true});assert.equal(t.sources.length,before+1);assert.equal(first.buffer,buffer);assert.equal(t.audio.last.voice,voice);assert.equal(first.loop,true);assert.equal(first.loopEnd,buffer.duration);assert.equal(first.duration,undefined,'do not truncate the recorded gau');assert.equal(first.playbackRate.value,1);assert.ok(first.stopAt>=1.3);assert.ok(first.stopAt<=1.3+duration+.005,'twenty same-clock packets keep one short hold plus a whole sample, rather than twenty queued barks');
 t.audio.ctx.currentTime=first.stopAt;first.onended();await new Promise(r=>setImmediate(r));assert.equal(t.sources.length,before+1,'no late queued heart after the stream stops');t.audio.stop();assert.equal(t.audio.active,0);
});

test('Original background loop is finite, smooth at its seam, reuses one buffer and ducks under speech/barks',()=>{
 const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/live-ambience.js'),'utf8'),{window});const Music=window.TuatAmbience,pcm=Music.compose(8000);let energy=0,peak=0;for(const n of pcm.data){assert.ok(Number.isFinite(n));peak=Math.max(peak,Math.abs(n));energy+=n*n;}assert.ok(peak<1&&Math.sqrt(energy/pcm.data.length)>.01);assert.ok(Math.abs(pcm.data[0])<.001&&Math.abs(pcm.data.at(-1))<.001);
 let buffers=0,starts=0,stops=0;const ctx={state:'running',currentTime:0,createBuffer(c,n){buffers++;const data=new Float32Array(n);return{getChannelData:()=>data};},createBufferSource(){return{connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};},createGain(){return{gain:{value:0,setTargetAtTime(n){this.value=n;}},connect(){},disconnect(){}};}},audio={ctx,limiter:{},active:0},music=new Music();music.sync({audio,enabled:true});const loud=music.gain.gain.value;audio.active=1;music.sync({audio,enabled:true});assert.ok(music.gain.gain.value<loud);audio.ducking=true;music.sync({audio,enabled:true});assert.ok(music.gain.gain.value<loud*.5);music.sync({audio,enabled:false});assert.equal(music.info().playing,false);music.sync({audio,enabled:true});assert.equal(buffers,1);assert.equal(starts,2);music.stop();assert.equal(stops,2);
});


test('Heart-driven barking does not switch to a long growl and interrupt the response rhythm',async()=>{
 const t=create();for(let i=0;i<8;i++){await t.audio.play({actor:'hearts',immediate:true});assert.equal(t.audio.last.vocal,'bark');t.audio.ctx.currentTime+=3;for(const s of [...t.audio.sources])s.stop();}t.audio.stop();
});

test('Many interactive viewers never cut the four recordings already playing and queued fighters get the next free slot',async()=>{
 const t=create();for(let i=0;i<4;i++)await t.audio.play({actor:'playing-'+i,immediate:true,count:10});const first=[...t.audio.sources];for(let i=0;i<10;i++)await t.audio.play({actor:'waiting-'+i,immediate:true,count:10});await t.audio.play({actor:'fighter',immediate:true,count:10,priority:2});assert.equal(t.sources.length,4);assert.ok(first.every(s=>t.audio.sources.has(s)));assert.equal(t.audio.active,4);
 t.audio.ctx.currentTime=.1;first[0].onended();await new Promise(r=>setImmediate(r));assert.equal(t.sources.length,5);assert.equal(t.audio.last.actor,'fighter');assert.equal(t.audio.active,4);t.audio.stop();await new Promise(r=>setImmediate(r));assert.equal(t.audio.active,0);assert.equal(t.audio.pendingBarks.size,0);
});

test('A large crowd has a bounded fresh voice queue and mute cannot revive a late sound',async()=>{
 const t=create();for(let i=0;i<250;i++)await t.audio.play({actor:'crowd-'+i,immediate:true});assert.equal(t.sources.length,4);assert.ok(t.audio.pendingBarks.size<=128);t.audio.ctx.currentTime=2;for(const s of [...t.audio.sources])s.onended();await new Promise(r=>setImmediate(r));assert.equal(t.audio.active,0);assert.equal(t.sources.length,4);t.audio.stop();
});


test('Batched hearts retain exactly the normal comment voice and full sample, looping on the audio clock',async()=>{
 for(const profile of manifest.profiles){const once=create(),burst=create();await once.audio.play({actor:'same',voice:profile.id,immediate:true,count:1});await burst.audio.play({actor:'same',voice:profile.id,immediate:true,count:15});const first=burst.sources[0];assert.equal(burst.audio.last.voice,once.audio.last.voice);assert.equal(first.playbackRate.value,1);assert.equal(first.duration,undefined);assert.equal(first.loopStart,first.offset);assert.equal(first.loopEnd,first.buffer.duration);assert.ok(first.stopAt>=1.8);assert.ok(first.stopAt<=3.5+first.buffer.duration+.01);
  for(let i=1;i<=20;i++){burst.audio.ctx.currentTime=i*.1;await burst.audio.play({actor:'same',voice:profile.id,immediate:true,count:1});}assert.equal(burst.sources.length,1,'all repeats must stay on the native audio clock, not onended timers');assert.equal(burst.audio.active,1);assert.ok(first.stopAt>2);burst.audio.ctx.currentTime=first.stopAt;first.onended();await new Promise(r=>setImmediate(r));assert.equal(burst.audio.active,0);assert.equal(burst.audio.pendingBarks.size,0);once.audio.stop();burst.audio.stop();}
});


test('Calm background stays audible beneath barks and lowers gently beneath narration',()=>{
 const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/live-ambience.js'),'utf8'),{window});const Music=window.TuatAmbience,pcm=Music.compose(8000);let energy=0;for(const value of pcm.data)energy+=value*value;const rms=Math.sqrt(energy/pcm.data.length);assert.ok(rms>=.1&&rms<=.13);assert.ok(pcm.seconds>25);const ctx={state:'running',currentTime:0,createBuffer:()=>({getChannelData:()=>({set(){}})}),createBufferSource:()=>({connect(){},disconnect(){},start(){},stop(){}}),createGain:()=>({gain:{value:0,setTargetAtTime(v){this.value=v;}},connect(){},disconnect(){}})},audio={ctx,limiter:{},active:1},music=new Music();music.sync({audio,enabled:true});const barkBed=music.gain.gain.value;assert.ok(rms*barkBed>.01,'background remains audible while the dogs bark');audio.ducking=true;music.sync({audio,enabled:true});assert.ok(rms*music.gain.gain.value>.005);assert.ok(music.gain.gain.value<barkBed);music.stop();
});


test('Break music uses sixty percent, returns for preparation, and keeps narration ducking and mute',()=>{
 const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/live-ambience.js'),'utf8'),{window});let starts=0;const ramps=[],ctx={state:'running',currentTime:0,createBuffer:()=>({getChannelData:()=>({set(){}})}),createBufferSource:()=>({connect(){},disconnect(){},start(){starts++;},stop(){}}),createGain:()=>({gain:{value:0,setTargetAtTime(v,at,smoothing){this.value=v;ramps.push(smoothing);}},connect(){},disconnect(){}})},audio={ctx,limiter:{},active:0},music=new window.TuatAmbience(),sync=(phase,volume=30)=>music.sync({audio,enabled:true,volume,masterVolume:65,phase});sync('battle');const battle=music.gain.gain.value;sync('break');assert.ok(Math.abs(music.gain.gain.value/battle-2)<1e-9);assert.equal(music.info().volume,60);assert.equal(ramps.at(-1),.45);audio.ducking=true;sync('break');assert.ok(Math.abs(music.gain.gain.value-battle*2*.38)<1e-9);assert.equal(ramps.at(-1),.1);audio.ducking=false;sync('prepare');assert.equal(music.gain.gain.value,battle);assert.equal(starts,1,'phase changes must not restart the music loop');sync('break',0);assert.equal(music.gain.gain.value,0);sync('break',100);assert.equal(music.info().volume,60);music.stop();
});


test('A heart arriving during the same dog automatic bark promotes it without cutting the recording',async()=>{
 const t=create();await t.audio.play({actor:'same-auto'});const automatic=t.sources.at(-1),voice=t.audio.last.voice;t.audio.ctx.currentTime=.1;await assert.doesNotReject(t.audio.play({actor:'same-auto',immediate:true}));const interactive=t.sources.at(-1);assert.equal(interactive,automatic);assert.equal(t.audio.sources.has(automatic),true);assert.equal(t.audio.active,1);assert.equal(t.audio.last.voice,voice);assert.equal(interactive.loop,true);assert.ok(Number.isFinite(interactive.stopAt));for(let i=0;i<10;i++){t.audio.ctx.currentTime+=.05;await t.audio.play({actor:'same-auto',immediate:true});assert.ok(Number.isFinite(interactive.stopAt));}assert.equal(t.audio.active,1);t.audio.stop();
});

test('A gau comment arriving during an automatic growl starts the fixed dog voice with a finite stop time',async()=>{
 const t=create();for(let i=0;i<3;i++){await t.audio.play({actor:'same-growl'});t.sources.at(-1).onended();t.audio.ctx.currentTime+=2;}await t.audio.play({actor:'same-growl'});assert.equal(t.audio.last.vocal,'growl');const growl=t.sources.at(-1);t.audio.ctx.currentTime+=.1;await assert.doesNotReject(t.audio.play({actor:'same-growl',immediate:true}));assert.equal(t.audio.sources.has(growl),false);assert.equal(t.audio.last.vocal,'bark');assert.equal(t.audio.last.voice,t.audio.voiceFor('same-growl'));assert.ok(Number.isFinite(t.sources.at(-1).stopAt));t.audio.stop();
});


test('Invalid loop timing falls back to a fresh bark and malformed counts never reach native stop as NaN',async()=>{
 for(const bad of [undefined,NaN,Infinity,0,-1]){const t=create();await t.audio.play({actor:'invalid',immediate:true});const broken=t.sources.at(-1);broken.barkDuration=bad;t.audio.ctx.currentTime=.1;await assert.doesNotReject(t.audio.play({actor:'invalid',immediate:true,count:NaN}));assert.notEqual(t.sources.at(-1),broken);assert.equal(t.audio.active,1);assert.ok(Number.isFinite(t.sources.at(-1).stopAt));t.audio.stop();}
 const t=create();for(const count of [NaN,Infinity,-Infinity,undefined]){await assert.doesNotReject(t.audio.play({actor:'count',immediate:true,count}));assert.ok(Number.isFinite(t.sources.at(-1).stopAt));t.audio.ctx.currentTime+=.05;}t.audio.stop();
});


test('Batched hearts sustain native loops across irregular packet gaps and auto barking cannot interrupt the stream',async()=>{
 const t=create();await t.audio.play({actor:'packets',immediate:true,count:15});const first=t.sources.at(-1);assert.ok(first.stopAt>=3.3);for(const at of [2.8,5.9,8.9]){t.audio.ctx.currentTime=at;await t.audio.play({actor:'packets',immediate:true,count:12});assert.equal(t.sources.at(-1),first);assert.ok(first.stopAt>=at+3.4);const until=first.stopAt;await t.audio.play({actor:'packets'});assert.equal(first.stopAt,until);assert.equal(t.sources.length,1);assert.equal(first.playbackRate.value,1);}t.audio.ctx.currentTime=first.stopAt;first.onended();await new Promise(r=>setImmediate(r));assert.equal(t.audio.active,0);t.audio.stop();
});

test('Quiet padding is removed from all dog samples without changing any audible samples or their rate',()=>{
 const t=create(),rateBuffer=(data,rate)=>({sampleRate:rate,numberOfChannels:1,length:data.length,duration:data.length/rate,getChannelData:()=>data}),ctx={createBuffer(channels,length,rate){return rateBuffer(new Float32Array(length),rate);}};
 let shortened=0;for(const profile of manifest.profiles)for(const clip of profile.clips){const bytes=fs.readFileSync(path.join(root,clip.path)),start=bytes.indexOf(Buffer.from('data'))+8,rate=bytes.readUInt32LE(24),samples=Float32Array.from({length:(bytes.length-start)/2},(_,i)=>bytes.readInt16LE(start+i*2)/32768),original=rateBuffer(samples,rate),tight=t.window.TuatBarks.tightenBarkBuffer(ctx,original),result=tight.getChannelData(0);assert.equal(tight.sampleRate,rate);assert.deepEqual([...result].filter(v=>Math.abs(v)>=.012),[...samples].filter(v=>Math.abs(v)>=.012),'audible waveform changed: '+clip.id);if(result.length<samples.length)shortened++;const step=Math.round(rate*.01),quiet=[];for(let i=0;i<result.length;i+=step){let energy=0;for(let j=i;j<Math.min(result.length,i+step);j++)energy+=result[j]*result[j];quiet.push(energy/Math.min(step,result.length-i)<.003**2);}let longest=0,run=0;const first=quiet.indexOf(false),last=quiet.lastIndexOf(false);for(const q of quiet.slice(first,last+1)){run=q?run+1:0;longest=Math.max(longest,run);}assert.ok(longest<=10,'long silent hole remains in '+clip.id);}assert.ok(shortened>=10);
});


test('A sustained crowd yields at complete bark boundaries so queued actors can actually get a voice',async()=>{
 const t=create(),heard=new Set();for(let i=0;i<8;i++){await t.audio.play({actor:'turn-'+i,immediate:true,count:15});if(t.audio.last)heard.add(t.audio.last.actor);}const first=[...t.audio.sources];assert.equal(first.length,4);assert.ok(first.every(s=>s.yieldAt>=s.barkStartedAt+s.barkDuration-.001));for(let i=0;i<10&&t.audio.pendingBarks.size;i++){const next=[...t.audio.sources].sort((a,b)=>a.endAt-b.endAt)[0];t.audio.ctx.currentTime=next.endAt;next.onended();await new Promise(r=>setImmediate(r));heard.add(t.audio.last.actor);}assert.equal(heard.size,8);assert.ok(t.audio.active<=4);t.audio.stop();
});


test('Hundreds of hearts at the same audio clock never restart the five-millisecond pending loop',async()=>{
 const t=create();for(let i=0;i<500;i++)await t.audio.play({actor:'same-clock',immediate:true,count:1});assert.equal(t.sources.length,1);assert.equal(t.audio.active,1);assert.ok(t.sources[0].at<=.005);assert.ok(Number.isFinite(t.sources[0].stopAt));assert.ok(t.sources[0].stopAt>=1.2);t.audio.stop();
});
