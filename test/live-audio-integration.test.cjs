// Offline client harness: real engine/session/client, minimal DOM and audio driver.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('../src/live-engine.js'),root=path.resolve(__dirname,'..');
async function client(role,{preview=false,capture=false,remoteURL=null,holdSpeech=false,blockedStartup=false,clockSkew=0,beforeSpeechStart}={}){
 const elements=new Map(),plays=[],giftCues=[],spoken=[],celebrations=[],playbacks=[],listeners=new Map();let sequence=0,finishSpeech;
 const element=()=>{const classes=new Set();return{value:'',textContent:'',innerHTML:'',dataset:{},style:{},classList:{toggle(name,force){const on=force??!classes.has(name);if(on)classes.add(name);else classes.delete(name);},add(name){classes.add(name);},remove(name){classes.delete(name);},contains(name){return classes.has(name);}},setAttribute(){},getAttribute(){return null;}};};
 const template=fs.readFileSync(path.join(root,'src',role==='manager'?'live-manager.template.html':'live-overlay.template.html'),'utf8');
 for(const match of template.matchAll(/id="([^"]+)"/g))elements.set(match[1],element());
 if(role==='manager')elements.get('settings-form').elements=new Proxy({}, {get(target,key){return target[key]||(target[key]=element());}});
 if(role==='manager')elements.get('live-settings-form').elements=new Proxy({}, {get(target,key){return target[key]||(target[key]=element());}});
 const localStorage=Object.create(null);Object.defineProperties(localStorage,{getItem:{value:k=>localStorage[k]||null},setItem:{value:(k,v)=>localStorage[k]=v},removeItem:{value:k=>delete localStorage[k]}});
 const window={addEventListener:(k,v)=>{const previous=listeners.get(k);listeners.set(k,previous?event=>{previous(event);return v(event);}:v);}};
 if(remoteURL){const WS=require('ws');window.WebSocket=class extends WS{constructor(url){super(url,{origin:remoteURL});}};}
 class Audio{
  constructor(){this.profiles=[{id:'dog',label:'Dog',count:2}];this.creatureProfiles=[{id:'tiger',kind:'recording',count:1},{id:'dragon',kind:'designed',count:2}];}
  async unlock(){if(blockedStartup){blockedStartup=false;this.ctx={state:'suspended'};const e=new Error('User gesture required');e.code='AUDIO_GESTURE';throw e;}this.ctx={state:'running'};}
  async play(options){plays.push(options);return true;}
  async speak(url,volume,hooks={}){spoken.push({url,volume,duckBarks:hooks.duckBarks});if(beforeSpeechStart)await beforeSpeechStart();hooks.onStart?.(2);const completed=holdSpeech?await new Promise(resolve=>finishSpeech=resolve):true;hooks.onEnd?.(completed);return completed;}
  async giftCue(kind,volume,options){giftCues.push({kind,volume,...options});return true;}
  async celebrate(volume){celebrations.push({volume});return true;}
  stopSpeech(){finishSpeech?.(false);finishSpeech=null;}
  stop(){this.stopSpeech();}info(){return{contextState:this.ctx?.state||'not-created'};}
 }
 const sandbox={window,TuatEngine:E,TuatBarks:Audio,localStorage,crypto:{randomUUID:()=>String(++sequence)},location:{search:capture?'?capture=1':preview?'?preview=1':'',origin:remoteURL||'http://unit.test',protocol:remoteURL?'http:':'file:',host:remoteURL?new URL(remoteURL).host:''},URLSearchParams,
  TuatAmbience:class{sync({enabled,volume=18,masterVolume=65}){this.playing=!!enabled&&volume>0&&masterVolume>0;}stop(){this.playing=false;}info(){return{playing:!!this.playing};}},
  document:{body:{dataset:{role},classList:{toggle(){}}},getElementById:id=>elements.get(id)||null,querySelectorAll:()=>[]},
  addEventListener:window.addEventListener,innerWidth:1080,innerHeight:1920,console,Date:class extends Date{static now(){return Date.now()+clockSkew;}},setTimeout:remoteURL?setTimeout:()=>0,clearTimeout:remoteURL?clearTimeout:()=>{},setInterval(){},
  TuatCanvas:class{resize(){}update(){}speechPlayback(message){playbacks.push(message);}}};
 vm.createContext(sandbox);sandbox.TuatGiftArt=window.TuatGiftArt=require('../src/live-gift-art.js');vm.runInContext(fs.readFileSync(path.join(root,'src/live-audio-session.js'),'utf8'),sandbox);sandbox.TuatAudioSession=window.TuatAudioSession;
 vm.runInContext(fs.readFileSync(path.join(root,'src/live-broadcast.js'),'utf8'),sandbox);sandbox.TuatBroadcast=window.TuatBroadcast;
 if(remoteURL){vm.runInContext(fs.readFileSync(path.join(root,'src/live-transport.js'),'utf8'),sandbox);sandbox.TuatTransport=window.TuatTransport;}
 vm.runInContext(fs.readFileSync(path.join(root,'src/live-client.js'),'utf8'),sandbox);
 await new Promise(resolve=>setImmediate(resolve));
 return{advance:ms=>clockSkew+=ms,bridge:window.DogBattleDemo,plays,giftCues,spoken,celebrations,playbacks,elements,listeners,finishSpeech:()=>{const finish=finishSpeech;finishSpeech=null;finish?.(true);}};
}

test('Manager emits combat sounds without needing an overlay tab and uses the transformed voice',async()=>{
 const {bridge,plays,giftCues,elements}=await client('manager');assert.equal(bridge.audioInfo().enabled,true);assert.match(elements.get('live-audio').textContent,/đang bật/);
 bridge.send('settings',{values:{prepareSeconds:0}});bridge.send('start');const fighter=bridge.getState().fighters[0];
 bridge.send('gift',{userId:fighter.id,name:fighter.name,team:fighter.team,gift:'dragon'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(giftCues.some(p=>p.kind==='dragon'));assert.ok(!plays.some(p=>p.form==='dragon'),'upgrade uses a transformation cue, not a skill roar');
 await elements.get('live-audio').onclick();assert.equal(bridge.audioInfo().enabled,false);assert.match(elements.get('live-audio').textContent,/Bật tiếng/);
});

test('Pausing the manager preview unloads its WebGL frame without changing the game or shared audio',async()=>{
 const c=await client('manager'),before=c.bridge.getState(),audio=c.bridge.audioInfo().enabled;c.elements.get('preview-toggle').onclick();assert.equal(c.elements.get('scene-preview').src,'about:blank');assert.equal(c.elements.get('scene-preview').hidden,true);assert.equal(c.elements.get('preview-paused').hidden,false);assert.deepEqual(c.bridge.getState(),before);assert.equal(c.bridge.audioInfo().enabled,audio);c.elements.get('preview-toggle').onclick();assert.match(c.elements.get('scene-preview').src,/preview=1.*demo=1/);assert.equal(c.elements.get('scene-preview').hidden,false);
});

test('Actual client code sends manager commands to the server and a separate overlay receives them without shared storage',async t=>{
 const fs=require('node:fs'),os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-client-'));
 const app=createApp({directory,port:0}),{url}=await app.listen(),manager=await client('manager',{remoteURL:url}),overlay=await client('overlay',{remoteURL:url});
 t.after(async()=>{manager.listeners.get('pagehide')?.();overlay.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-client-')));fs.rmSync(directory,{recursive:true,force:true});});
 app.runtime.configure({voiceEnabled:false});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw new Error('No client state update');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>manager.elements.get('sync-status').textContent==='Máy chủ đang điều phối');
 let dropped=false;const command=app.runtime.command.bind(app.runtime);app.runtime.command=value=>{const result=command(value);if(value.type==='start'&&!dropped){dropped=true;for(const ws of app.wss.clients)if(ws.role==='manager')ws.terminate();}return result;};
 manager.bridge.send('settings',{values:{demoFill:true,prepareSeconds:0}});manager.bridge.send('start');await until(()=>overlay.bridge.getState().phase==='battle');assert.equal(app.runtime.document.game.round,1);assert.equal(overlay.bridge.getState().round,1);
 await until(()=>manager.bridge.connectionInfo().serverConnected&&manager.bridge.connectionInfo().pending===0);assert.equal(app.runtime.document.game.round,1);assert.equal(dropped,true);
 await until(()=>manager.bridge.audioInfo().enabled||overlay.bridge.audioInfo().enabled);assert.notEqual(manager.bridge.audioInfo().enabled,overlay.bridge.audioInfo().enabled);
 manager.bridge.send('pause');await until(()=>overlay.bridge.getState().paused);assert.equal(app.runtime.document.game.paused,true);
});

test('Preview iframe stays silent; a full overlay can emit combat sounds',async()=>{
 const muted=await client('overlay',{preview:true});assert.equal(muted.bridge.audioInfo().enabled,false);assert.equal(muted.elements.has('overlay-audio'),false);muted.bridge.send('start');assert.equal(muted.plays.length,0);
 const live=await client('overlay');assert.equal(live.bridge.audioInfo().enabled,true);live.bridge.send('settings',{values:{prepareSeconds:0}});live.bridge.send('start');const f=live.bridge.getState().fighters[0];live.bridge.send('gift',{userId:f.id,name:f.name,team:f.team,gift:'tiger'});
 await new Promise(resolve=>setImmediate(resolve));assert.ok(live.giftCues.some(p=>p.kind==='tiger'));assert.ok(!live.plays.some(p=>p.form==='tiger'));
});

test('TikTok hearts and gau comments reach the overlay sound path even for dogs waiting outside the court',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-heart-audio-'));
 const app=createApp({directory,port:0}),{url}=await app.listen(),overlay=await client('overlay',{remoteURL:url});app.runtime.configure({voiceEnabled:false});
 t.after(async()=>{overlay.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-heart-audio-')));fs.rmSync(directory,{recursive:true,force:true});});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw new Error('No bark audio delivered');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>overlay.bridge.audioInfo().enabled);app.runtime.ingest('like',{common:{msgId:'audio-like'},user:{id:'a',nickname:'An'},likeCount:12},'r');
 await until(()=>overlay.plays.some(p=>!p.preview&&p.actor==='tt:a'&&p.form==='dog'));
 app.runtime.ingest('chat',{common:{msgId:'audio-gau'},user:{id:'b',nickname:'Bình'},comment:'gâu'},'r');await until(()=>overlay.plays.some(p=>!p.preview&&p.actor==='tt:b'&&p.form==='dog'));
 const n=overlay.plays.length;app.runtime.ingest('like',{common:{msgId:'audio-like'},user:{id:'a',nickname:'An'},likeCount:12},'r');assert.equal(overlay.plays.length,n);assert.equal(app.runtime.document.metrics.like,12);
});

test('Automatic welcomes reach the selected overlay and gifts displace queued welcomes instead of being lost',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-tts-client-'));
 const app=createApp({directory,port:0}),{url}=await app.listen(),overlay=await client('overlay',{remoteURL:url,holdSpeech:true}),published=[];
 app.runtime.speech.synth=async()=>Buffer.from('RIFFcomplete fixture');app.runtime.on('speech',item=>published.push(item));app.runtime.configure({voiceEnabled:true,readJoins:true,readGifts:true});
 t.after(async()=>{overlay.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-tts-client-')));fs.rmSync(directory,{recursive:true,force:true});});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw new Error('Narration did not reach output');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>overlay.bridge.audioInfo().enabled);
 for(let i=0;i<7;i++)app.runtime.ingest('member',{common:{msgId:'welcome-'+i},user:{id:'user-'+i,nickname:'Na '+i}},'r');
 await until(()=>published.length===7&&overlay.spoken.length===1);await new Promise(resolve=>setTimeout(resolve,40));
 app.runtime.ingest('gift',{common:{msgId:'thanks'},user:{id:'donor',nickname:'An'},giftId:5655,gift:{type:0,name:'Rose',diamondCount:1},repeatCount:1},'r');
 await until(()=>published.length===8);assert.equal(published.at(-1).priority,1);await until(()=>overlay.spoken.length===2);
 assert.equal(overlay.spoken[1].url,published.at(-1).url,'gift thank-you is next even when all six waiting slots were welcomes');assert.equal(overlay.spoken[1].volume,E.defaults.volume);
});

test('Spoken scenes never fall back to early shots with a legacy source, and a modern source takes over automatically',async t=>{
 const os=require('node:os'),WS=require('ws'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-old-audio-camera-'));
 const app=createApp({directory,port:0}),{url}=await app.listen();app.runtime.configure({voiceEnabled:true,readJoins:true});
 const legacy=new WS(url.replace('http:','ws:')+'/ws?role=overlay',{origin:url});await new Promise(resolve=>legacy.once('open',resolve));const selected=new Promise(resolve=>legacy.on('message',data=>{if(JSON.parse(data).type==='audio-output')resolve();}));legacy.send(JSON.stringify({type:'audio-ready',ready:true}));await selected;
 const overlay=await client('overlay',{remoteURL:url,blockedStartup:true});t.after(async()=>{overlay.listeners.get('pagehide')?.();legacy.close();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-old-audio-camera-')));fs.rmSync(directory,{recursive:true,force:true});});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw new Error('Audio capability did not update');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>overlay.bridge.connectionInfo().serverConnected&&overlay.bridge.getState().welcomeSpeechEnabled===true);assert.equal(overlay.bridge.audioInfo().enabled,false);assert.equal(overlay.bridge.getState().giftSpeechEnabled,true,'voice-enabled gifts must wait even when the selected source is old');
 await overlay.listeners.get('pointerdown')({target:{closest:()=>null}});await until(()=>overlay.bridge.audioInfo().enabled&&overlay.bridge.getState().welcomeSpeechEnabled===true);
 legacy.send(JSON.stringify({type:'audio-claim'}));await new Promise(r=>setTimeout(r,50));assert.equal(overlay.bridge.audioInfo().enabled,true,'legacy claims cannot take back the synchronized source');
 app.runtime.command({id:'mute-shared',type:'settings',values:{volume:0}});await until(()=>!overlay.bridge.audioInfo().enabled);assert.equal(overlay.bridge.getState().welcomeSpeechEnabled,true,'muting must not re-enable early camera shots');
});

test('Queued welcomes synchronize every overlay to the voice actually playing, after synthesis and in spoken order',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-spoken-camera-'));
 const app=createApp({directory,port:0}),{url}=await app.listen(),audible=await client('overlay',{remoteURL:url,holdSpeech:true,clockSkew:300000}),preview=await client('overlay',{remoteURL:url,preview:true,clockSkew:300000});let release,first=true;
 app.runtime.speech.synth=async()=>{if(first){first=false;await new Promise(resolve=>release=resolve);}return Buffer.from('RIFFcomplete fixture');};app.runtime.configure({voiceEnabled:true,readJoins:true});
 t.after(async()=>{audible.listeners.get('pagehide')?.();preview.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-spoken-camera-')));fs.rmSync(directory,{recursive:true,force:true});});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw new Error('Welcome camera not synchronized');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>audible.bridge.audioInfo().enabled);for(const id of ['An','Bình'])app.runtime.ingest('member',{common:{msgId:'sync-'+id},user:{id,nickname:id}},'r');
 await until(()=>preview.bridge.getState().people.length===2);assert.equal(preview.playbacks.length,0,'new viewer snapshot alone must not trigger a spoken camera cue');assert.equal(audible.spoken.length,0);assert.equal(preview.elements.get('welcome').textContent,'','arrival banner must wait while speech is being synthesized');assert.equal(audible.elements.get('welcome').classList.contains('visible'),false);
 release();await until(()=>audible.spoken.length===1&&preview.playbacks.some(m=>m.phase==='start'));assert.equal(preview.playbacks.filter(m=>m.phase==='start').length,1);assert.equal(preview.playbacks.find(m=>m.phase==='start').welcome.personId,'tt:An');assert.equal(preview.spoken.length,0,'preview stays silent');assert.ok(Math.abs(preview.playbacks.find(m=>m.phase==='start').startedAt-Date.now()-300000)<1000,'server timestamp must be mapped to the overlay clock');assert.ok(Math.abs(audible.playbacks.find(m=>m.phase==='start').startedAt-Date.now()-300000)<1000,'local playback already uses the local clock');
 assert.equal(preview.elements.get('welcome').textContent,'Tuất An đến rồi!');assert.equal(audible.elements.get('welcome').textContent,'Tuất An đến rồi!');assert.equal(preview.elements.get('welcome').classList.contains('visible'),true,'show the name being read, not the newer queued arrival');
 audible.finishSpeech();await until(()=>audible.spoken.length===2&&preview.playbacks.filter(m=>m.phase==='start').length===2);assert.deepEqual(preview.playbacks.filter(m=>m.phase==='start').map(m=>m.welcome.personId),['tt:An','tt:Bình']);assert.equal(preview.playbacks.find(m=>m.phase==='end').completed,true);assert.equal(preview.elements.get('welcome').textContent,'Tuất Bình đến rồi!');
 audible.finishSpeech();await until(()=>preview.playbacks.filter(m=>m.phase==='end').length===2);assert.equal(preview.elements.get('welcome').textContent,'');assert.equal(preview.elements.get('welcome').classList.contains('visible'),false,'do not revive an old join banner after the voice ends');
});

test('Paid gifts apply immediately but their banner and camera follow actual thanks playback, preempt welcomes and keep donor order',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-gift-presentation-'));
 const app=createApp({directory,port:0}),{url}=await app.listen(),overlay=await client('overlay',{remoteURL:url,holdSpeech:true}),preview=await client('overlay',{remoteURL:url,preview:true});let release;
 app.runtime.speech.synth=async text=>{if(text.includes('Cảm ơn')&&text.includes('rồng'))await new Promise(resolve=>release=resolve);return Buffer.from('RIFFfixture');};app.runtime.configure({voiceEnabled:true,readJoins:true,readGifts:true,readRounds:false});
 t.after(async()=>{overlay.listeners.get('pagehide')?.();preview.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-gift-presentation-')));fs.rmSync(directory,{recursive:true,force:true});});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw Error('Gift presentation not synchronized');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>overlay.bridge.audioInfo().enabled);app.runtime.command({id:'gift-demo',type:'settings',values:{prepareSeconds:0,demoFill:true}});app.runtime.command({id:'A-join',type:'join',announce:true,userId:'A',name:'An',team:'left'});app.runtime.command({id:'B-join',type:'join',userId:'B',name:'Bình',team:'right'});app.runtime.command({id:'gift-start',type:'start'});await until(()=>overlay.spoken.length===1);
 app.runtime.command({id:'dragon-gift',type:'gift',announce:true,userId:'A',gift:'dragon'});await until(()=>release&&preview.bridge.getState().fighters.some(f=>f.id==='A'&&f.form==='dragon'));
 assert.equal(app.runtime.document.game.people.find(p=>p.id==='A').permanentForm,'dragon');assert.equal(preview.playbacks.some(m=>m.phase==='start'&&m.presentation?.kind==='gift'),false);assert.doesNotMatch(preview.elements.get('welcome').textContent,/rồng|Rồng/,'do not show gift notice while the voice is still being created');
 release();await until(()=>overlay.spoken.length===2&&preview.playbacks.some(m=>m.phase==='start'&&m.presentation?.kind==='gift'));const first=preview.playbacks.find(m=>m.phase==='start'&&m.presentation?.kind==='gift');assert.equal(first.presentation.event.personId,'A');assert.equal(first.presentation.event.gift,'dragon');assert.ok(preview.playbacks.some(m=>m.phase==='end'&&m.completed===false),'paid thanks interrupt the playing welcome');assert.match(preview.elements.get('welcome').textContent,/Cảm ơn Tuất An/);
 app.runtime.command({id:'rose-gift',type:'gift',announce:true,userId:'B',gift:'rose'});await until(()=>app.runtime.document.game.people.find(p=>p.id==='B').coins>0);await new Promise(r=>setTimeout(r,100));assert.equal(overlay.spoken.length,2,'do not interrupt another paid thank-you');assert.match(preview.elements.get('welcome').textContent,/Cảm ơn Tuất An/);
 overlay.finishSpeech();await until(()=>overlay.spoken.length===3&&preview.playbacks.filter(m=>m.phase==='start'&&m.presentation?.kind==='gift').length===2);assert.deepEqual(preview.playbacks.filter(m=>m.phase==='start'&&m.presentation?.kind==='gift').map(m=>m.presentation.event.personId),['A','B']);assert.match(preview.elements.get('welcome').textContent,/Cảm ơn Tuất Bình/);
});

test('Manager join and gift buttons announce through the server and the TTS test unlocks its own audio output',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-demo-tts-'));
 const app=createApp({directory,port:0}),{url}=await app.listen(),manager=await client('manager',{remoteURL:url}),published=[];
 app.runtime.speech.synth=async()=>Buffer.from('RIFFcomplete fixture');app.runtime.on('speech',item=>published.push(item));app.runtime.configure({voiceEnabled:true,readJoins:true,readGifts:true});
 t.after(async()=>{manager.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-demo-tts-')));fs.rmSync(directory,{recursive:true,force:true});});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw new Error('Demo narration missing');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>manager.bridge.audioInfo().enabled);manager.elements.get('join-name').value='Na';manager.elements.get('join-form').onsubmit({preventDefault(){}});
 await until(()=>manager.spoken.length===1);assert.match(published[0].text,/Tuất Na/);assert.equal(manager.spoken[0].duckBarks,false,'a welcome must preserve competitive barking volume');
 await until(()=>manager.bridge.getState().people.length===1);const person=app.runtime.document.game.people[0];manager.elements.get('event-person').value=person.id;manager.elements.get('gift-team').value='left';manager.elements.get('gift-count').value='1';manager.elements.get('gift-buttons').onclick({target:{closest:()=>({dataset:{gift:'rose'}})}});
 await until(()=>manager.spoken.length===2);assert.match(published[1].text,/Cảm ơn Tuất Na/);assert.equal(manager.spoken[1].duckBarks,true,'only gift narration ducks the dogs');
 await manager.elements.get('live-audio').onclick();await until(()=>!manager.bridge.audioInfo().enabled);await manager.elements.get('tts-test').onclick();await until(()=>manager.spoken.length===3);assert.equal(manager.bridge.audioInfo().enabled,true);
});

test('Joining from an autoplay-blocked manager unlocks and selects audio before the welcome is published',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-gesture-join-'));
 const app=createApp({directory,port:0}),{url}=await app.listen(),manager=await client('manager',{remoteURL:url,blockedStartup:true}),published=[];
 app.runtime.speech.synth=async()=>Buffer.from('RIFFcomplete fixture');app.runtime.on('speech',item=>published.push(item));app.runtime.configure({voiceEnabled:true,readJoins:true});
 t.after(async()=>{manager.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-gesture-join-')));fs.rmSync(directory,{recursive:true,force:true});});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw new Error('Blocked welcome was lost');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>manager.bridge.connectionInfo().serverConnected);assert.equal(manager.bridge.audioInfo().enabled,false);
 manager.elements.get('join-name').value='nguyenvanan';await manager.elements.get('join-form').onsubmit({preventDefault(){}});
 await until(()=>manager.spoken.length===1);assert.equal(manager.bridge.audioInfo().enabled,true);assert.match(published[0].spokenText,/Tuất Nguyễn Văn An/);assert.equal(app.runtime.document.game.people.length,1);
});

test('The honor fanfare plays once on the chosen output, while reconnect/reload and preview stay silent',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-honor-audio-')),app=createApp({directory,port:0});app.runtime.configure({voiceEnabled:false});const {url}=await app.listen(),manager=await client('manager',{remoteURL:url}),overlay=await client('overlay',{remoteURL:url});let reload;
 t.after(async()=>{for(const c of [manager,overlay,reload])c?.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-honor-audio-')));fs.rmSync(directory,{recursive:true,force:true});});
 const until=async p=>{const end=Date.now()+3000;while(!p()){if(Date.now()>end)throw new Error('Honor output did not arrive');await new Promise(r=>setTimeout(r,10));}};
 await until(()=>manager.bridge.audioInfo().enabled||overlay.bridge.audioInfo().enabled);app.runtime.command({id:'honor-settings',type:'settings',values:{demoFill:true,prepareSeconds:0}});app.runtime.command({id:'honor-start',type:'start'});await until(()=>overlay.bridge.getState().phase==='battle');const command={id:'honor-finish',type:'next'};app.runtime.command(command);await until(()=>manager.celebrations.length+overlay.celebrations.length===1);app.runtime.command(command);await new Promise(r=>setTimeout(r,100));assert.equal(manager.celebrations.length+overlay.celebrations.length,1);
 reload=await client('overlay',{remoteURL:url});await until(()=>reload.bridge.getState().phase==='break');assert.equal(reload.celebrations.length,0);assert.equal(manager.celebrations.length+overlay.celebrations.length,1);
});

test('A draw honors the named champion immediately ahead of a playing welcome and queued gifts',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-honor-priority-')),app=createApp({directory,port:0});app.runtime.configure({voiceEnabled:true,readRounds:false,readWinner:true,readJoins:true});app.runtime.speech.synth=async()=>Buffer.from('RIFFfixture');const {url}=await app.listen(),overlay=await client('overlay',{remoteURL:url,holdSpeech:true}),published=[];app.runtime.on('speech',m=>published.push(m));
 t.after(async()=>{overlay.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-honor-priority-')));fs.rmSync(directory,{recursive:true,force:true});});const until=async p=>{const end=Date.now()+3000;while(!p()){if(Date.now()>end)throw Error('Honor voice missing');await new Promise(r=>setTimeout(r,10));}};
 await until(()=>overlay.bridge.audioInfo().enabled);app.runtime.ingest('member',{common:{msgId:'join'},user:{id:'a',nickname:'minhngoc'}},'r');await until(()=>overlay.spoken.length===1);app.runtime.command({id:'settings',type:'settings',values:{demoFill:true,prepareSeconds:0}});app.runtime.command({id:'start',type:'start'});app.runtime.command({id:'gift',type:'gift',announce:true,userId:'tt:a',gift:'rose'});await until(()=>published.length===2);app.runtime.command({id:'finish',type:'next'});await until(()=>published.some(m=>m.honorId)&&overlay.spoken.some(p=>p.url===published.find(m=>m.honorId).url));const honor=published.find(m=>m.honorId);assert.match(honor.text,/Vinh danh Tuất Vương/);assert.match(honor.text,/hòa nhau/);assert.equal(overlay.spoken.at(-1).url,honor.url);await until(()=>overlay.celebrations.length===1);
});


test('Actual overlay holds 15 seconds through audio loading and releases countdown only when speech begins',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-round-sync-')),app=createApp({directory,port:0});
 app.runtime.configure({voiceEnabled:false});app.runtime.speech.synth=async()=>Buffer.from('RIFFphase');app.runtime.speech.prepared.clear();let release;
 const {url}=await app.listen(),overlay=await client('overlay',{remoteURL:url,beforeSpeechStart:()=>new Promise(resolve=>release=resolve)});
 t.after(async()=>{release?.();overlay.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-round-sync-')));fs.rmSync(directory,{recursive:true,force:true});});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw new Error('Phase playback sync missing');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>app.runtime.roundAudioReady);app.runtime.configure({voiceEnabled:true,readRounds:true});app.runtime.command({type:'start',id:'prepare-audible'});await until(()=>release);
 assert.equal(app.runtime.document.game.remaining,15);assert.ok(app.runtime.document.game.preparationVoice);assert.equal(overlay.bridge.getState().remaining,15);
 await new Promise(resolve=>setTimeout(resolve,120));assert.ok(app.runtime.document.game.preparationVoice,'ready clip alone cannot consume preparation time');const at=Date.now();release();await until(()=>!app.runtime.document.game.preparationVoice);
 assert.ok(Math.abs(app.runtime.document.game.phaseEnd-at-15000)<100);assert.equal(app.runtime.document.game.phase,'prepare');assert.equal(overlay.spoken.length,1);
});


test('Overlay has no large cumulative-wins popup and keeps the match champion honors',async()=>{
 const c=await client('overlay');assert.equal(c.elements.has('wins-board'),false);assert.equal(c.elements.has('round-honor'),true);
});


test('Reset button is guarded, updates both profiles and leaves a complete recoverable backup',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-reset-ui-')),app=createApp({directory,port:0});app.runtime.configure({voiceEnabled:false});app.runtime.command({id:'reset-ui-person',type:'join',userId:'person',name:'An'});const before=structuredClone(app.runtime.document),{url}=await app.listen(),manager=await client('manager',{remoteURL:url}),overlay=await client('overlay',{remoteURL:url});
 t.after(async()=>{manager.listeners.get('pagehide')?.();overlay.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-reset-ui-')));fs.rmSync(directory,{recursive:true,force:true});});const until=async f=>{const end=Date.now()+3000;while(!f()){if(Date.now()>end)throw Error('reset not synchronized');await new Promise(r=>setTimeout(r,10));}};await until(()=>manager.bridge.getState().people.length===1);manager.elements.get('reset-open').onclick();manager.elements.get('reset-confirm').value='NO';await manager.elements.get('reset-submit').onclick();assert.equal(app.runtime.document.game.people.length,1);assert.match(manager.elements.get('reset-status').textContent,/RESET/);manager.elements.get('reset-confirm').value='RESET';await manager.elements.get('reset-submit').onclick();await until(()=>overlay.bridge.getState().people.length===0);const files=fs.readdirSync(directory).filter(f=>f.startsWith('before-reset-'));assert.equal(files.length,1);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,files[0]),'utf8')).game.people,before.game.people);assert.equal(manager.elements.get('reset-panel').hidden,true);
});


test('Overlay starts without an audio button and recovers autoplay on a court gesture; preview never starts music',async()=>{
 const overlay=await client('overlay',{blockedStartup:true});assert.equal(overlay.elements.has('overlay-audio'),false);assert.equal(overlay.bridge.audioInfo().enabled,false);
 await overlay.listeners.get('pointerdown')({target:{closest:()=>null}});await new Promise(resolve=>setImmediate(resolve));overlay.bridge.send('settings',{values:{musicEnabled:true}});
 assert.equal(overlay.bridge.audioInfo().enabled,true);assert.equal(overlay.elements.get('broadcast').dataset.musicState,'playing');
 const preview=await client('overlay',{preview:true});preview.bridge.send('settings',{values:{musicEnabled:true}});assert.equal(preview.elements.get('broadcast').dataset.musicState,'off');
});

test('Manager toggles shared sound and music on an independent overlay, which automatically owns output',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-auto-audio-'));
 const app=createApp({directory,port:0}),{url}=await app.listen(),manager=await client('manager',{remoteURL:url});
 const until=async predicate=>{const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw new Error('Shared automatic audio did not update');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>manager.bridge.audioInfo().enabled);const overlay=await client('overlay',{remoteURL:url});
 t.after(async()=>{manager.listeners.get('pagehide')?.();overlay.listeners.get('pagehide')?.();await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-auto-audio-')));fs.rmSync(directory,{recursive:true,force:true});});
 await until(()=>overlay.bridge.audioInfo().enabled&&!manager.bridge.audioInfo().enabled);assert.equal(overlay.elements.get('broadcast').dataset.musicState,'playing');
 await manager.elements.get('live-audio').onclick();await until(()=>!overlay.bridge.audioInfo().enabled&&!manager.bridge.audioInfo().enabled&&overlay.elements.get('broadcast').dataset.musicState==='off');assert.equal(app.runtime.document.game.config.volume,0);
 await manager.elements.get('live-audio').onclick();await until(()=>overlay.bridge.audioInfo().enabled&&!manager.bridge.audioInfo().enabled&&overlay.elements.get('broadcast').dataset.musicState==='playing');assert.equal(app.runtime.document.game.config.volume,E.defaults.volume);
});
test('Queued welcome chooses the 30-person boundary at actual speech onset and keeps its banner for that sentence',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-crowded-welcome-'));let release,starts=0;
 const app=createApp({directory,port:0});app.runtime.configure({voiceEnabled:false});app.runtime.speech.synth=async()=>Buffer.from('RIFFfixture');
 for(let i=0;i<29;i++)app.runtime.command({id:'seed-'+i,type:'join',userId:'person-'+i,name:'Bạn '+i});
 const {url}=await app.listen(),audible=await client('overlay',{remoteURL:url,holdSpeech:true,beforeSpeechStart:async()=>{if(!starts++)await new Promise(resolve=>release=resolve);}}),preview=await client('overlay',{remoteURL:url,preview:true});
 t.after(async()=>{audible.listeners.get('pagehide')?.();preview.listeners.get('pagehide')?.();await app.close();fs.rmSync(directory,{recursive:true,force:true});});
 const until=async predicate=>{const end=Date.now()+4000;while(!predicate()){if(Date.now()>end)throw Error('Crowded welcome did not synchronize');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>audible.bridge.audioInfo().enabled);app.runtime.configure({voiceEnabled:true,readJoins:true});app.runtime.ingest('member',{common:{msgId:'thirtieth'},user:{id:'new',nickname:'An'}},'r');await until(()=>release);
 app.runtime.command({id:'cross-threshold',type:'join',userId:'person-30',name:'Bình'});await until(()=>audible.bridge.getState().people.length===31&&preview.bridge.getState().people.length===31);release();
 await until(()=>preview.playbacks.some(m=>m.phase==='start'));assert.equal(preview.playbacks.find(m=>m.phase==='start').welcomeMode,'banner');assert.equal(audible.playbacks.find(m=>m.phase==='start').welcomeMode,'banner');assert.equal(preview.elements.get('welcome').classList.contains('crowd-welcome'),true);assert.equal(preview.elements.get('welcome').classList.contains('visible'),true);
 app.runtime.command({id:'below-again',type:'remove',userId:'person-30'});await until(()=>preview.bridge.getState().people.length===30);assert.equal(preview.elements.get('welcome').classList.contains('crowd-welcome'),true,'keep onset choice even when count changes mid-sentence');
 audible.finishSpeech();await until(()=>preview.playbacks.some(m=>m.phase==='end'));assert.equal(preview.elements.get('welcome').classList.contains('visible'),false);
 app.runtime.command({id:'room-for-new',type:'remove',userId:'person-28'});app.runtime.ingest('member',{common:{msgId:'thirtieth-again'},user:{id:'next',nickname:'Na'}},'r');await until(()=>preview.playbacks.filter(m=>m.phase==='start').length===2);assert.equal(preview.playbacks.filter(m=>m.phase==='start')[1].welcomeMode,'camera');assert.equal(preview.elements.get('welcome').classList.contains('crowd-welcome'),false);audible.finishSpeech();
});

test('Dedicated portrait capture prevents manual zoom and fullscreen shortcuts without blocking reload or normal input',async()=>{
 const c=await client('overlay',{capture:true});let prevented=0;const event=values=>({preventDefault(){prevented++;},...values});
 for(const key of ['+','-','=','0'])c.listeners.get('keydown')(event({key,ctrlKey:true}));c.listeners.get('keydown')(event({key:'F11'}));assert.equal(prevented,5);
 c.listeners.get('wheel')(event({ctrlKey:true}));c.listeners.get('wheel')(event({metaKey:true}));assert.equal(prevented,7);c.listeners.get('gesturestart')(event({}));assert.equal(prevented,8);
 c.listeners.get('wheel')(event({}));c.listeners.get('keydown')(event({key:'r',ctrlKey:true}));c.listeners.get('keydown')(event({key:'g'}));assert.equal(prevented,8,'reload and ordinary interactions remain available');
 const regular=await client('overlay');assert.equal(regular.listeners.has('wheel'),false,'normal overlays and model preview keep their existing controls');
});

test('A delayed snapshot cannot move the match clock five seconds behind the already synchronized clock',async t=>{
 const os=require('node:os'),{createApp}=require('../server/app.cjs'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-clock-delay-')),app=createApp({directory,port:0});app.runtime.configure({voiceEnabled:false});app.runtime.command({id:'clock-settings',type:'settings',values:{prepareSeconds:0}});app.runtime.command({id:'clock-start',type:'start'});const {url}=await app.listen(),manager=await client('manager',{remoteURL:url,clockSkew:8000});
 t.after(async()=>{manager.listeners.get('pagehide')?.();await app.close();fs.rmSync(directory,{recursive:true,force:true});});const until=async fn=>{const end=Date.now()+4000;while(!fn()){if(Date.now()>end)throw Error('Clock sample missing');await new Promise(r=>setTimeout(r,5));}};
 await until(()=>manager.bridge.getState().phase==='battle');const seconds=()=>manager.elements.get('control-clock').textContent.split(':').reduce((n,v)=>n*60+Number(v),0),before=seconds(),late=structuredClone(app.runtime.snapshot());late.serverTime-=5000;late.state.config.title='delayed-clock-packet';for(const socket of app.wss.clients)socket.send(JSON.stringify(late));await until(()=>manager.bridge.getState().config.title==='delayed-clock-packet');assert.ok(Math.abs(seconds()-before)<=1,'queued packet delay must not become a new clock offset');
});
