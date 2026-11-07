const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const WebSocket=require('ws'),{createApp}=require('../server/app.cjs');
async function setup(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-ws-')),app=createApp({directory,port:0});app.runtime.command({id:'fixture-demo',type:'settings',values:{demoFill:true,prepareSeconds:0}});app.runtime.configure({voiceEnabled:false});const {url,port}=await app.listen();t.after(async()=>{await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-ws-')));fs.rmSync(directory,{recursive:true,force:true});});return{app,url,port};}
async function socket(url,role='manager',origin=url){
 const ws=new WebSocket(url.replace('http:','ws:')+'/ws?role='+role,{origin}),messages=[],waiters=[];
 ws.on('message',bytes=>{const m=JSON.parse(bytes);messages.push(m);for(const w of [...waiters])if(w.match(m)){clearTimeout(w.timer);waiters.splice(waiters.indexOf(w),1);w.resolve(m);}});
 const wait=match=>{const found=messages.find(match);if(found)return Promise.resolve(found);return new Promise((resolve,reject)=>{const w={match,resolve,timer:setTimeout(()=>reject(new Error('Timed out waiting for WebSocket frame')),3000)};waiters.push(w);});};
 await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});return{ws,messages,wait};
}
test('Independent manager/overlay storage shares one authoritative game and overlay commands are rejected',async t=>{
 const {app,url}=await setup(t),manager=await socket(url),overlay=await socket(url,'overlay');
 const first=await overlay.wait(m=>m.type==='snapshot');assert.equal(first.state.phase,'ready');
 manager.ws.send(JSON.stringify({type:'command',requestId:'start',command:{type:'start',id:'start-command'}}));await manager.wait(m=>m.type==='ack'&&m.requestId==='start');
 const live=await overlay.wait(m=>m.type==='snapshot'&&m.state.phase==='battle');assert.equal(live.state.fighters.length,10);
 overlay.ws.send(JSON.stringify({type:'command',requestId:'evil',command:{type:'next',id:'overlay-next'}}));await overlay.wait(m=>m.type==='error');assert.equal(app.runtime.document.game.phase,'battle');
 manager.ws.close();const until=app.runtime.document.game.phaseEnd;assert.ok(until>Date.now());
 app.runtime.command({type:'pause',id:'server-pause'});await overlay.wait(m=>m.type==='snapshot'&&m.state.paused);overlay.ws.close();
});

test('Capture health is bounded, transient and cannot change the game or enable overlay controls',async t=>{
 const {app,url}=await setup(t),overlay=await socket(url,'overlay'),before=structuredClone(app.runtime.document);overlay.ws.send(JSON.stringify({type:'presentation-health',stats:{sequence:12,snapshotAge:100,wireDelay:-30,frameAge:'bad',fps:999,timerLag:5,visible:true}}));
 let rows;const end=Date.now()+3000;do{rows=(await fetch(url+'/health').then(r=>r.json())).presentation;if(rows.length)break;await new Promise(r=>setTimeout(r,10));}while(Date.now()<end);assert.equal(rows.length,1);assert.equal(rows[0].fps,240);assert.equal(rows[0].wireDelay,0);assert.equal(rows[0].frameAge,undefined);assert.deepEqual(app.runtime.document,before);
 overlay.ws.send(JSON.stringify({type:'command',requestId:'health-cannot-control',command:{type:'start',id:'bad-capture-command'}}));await overlay.wait(m=>m.type==='error'&&m.error.includes('Overlay'));assert.equal(app.runtime.document.game.phase,'ready');overlay.ws.close();
});

test('Only a manager may open the native portrait window, always at the server port without caller paths',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-open-capture-')),calls=[],app=createApp({directory,port:0,openCapture:port=>{calls.push(port);return{opening:true};}}),{url,port}=await app.listen();t.after(async()=>{await app.close();fs.rmSync(directory,{recursive:true,force:true});});const manager=await socket(url),overlay=await socket(url,'overlay');
 overlay.ws.send(JSON.stringify({type:'open-overlay',requestId:'denied-open'}));await overlay.wait(m=>m.type==='error'&&m.error.includes('Overlay'));assert.deepEqual(calls,[]);
 manager.ws.send(JSON.stringify({type:'open-overlay',requestId:'allowed-open',port:1,path:'untrusted'}));await manager.wait(m=>m.type==='ack'&&m.requestId==='allowed-open');assert.deepEqual(calls,[port]);manager.ws.close();overlay.ws.close();
});
test('Output audio is coordinated across profiles and falls back when the selected window closes',async t=>{
 const {url}=await setup(t),a=await socket(url),b=await socket(url,'overlay');const wa=await a.wait(m=>m.type==='welcome'),wb=await b.wait(m=>m.type==='welcome');
 a.ws.send(JSON.stringify({type:'audio-ready',ready:true}));await a.wait(m=>m.type==='audio-output'&&m.clientId===wa.clientId);
 b.ws.send(JSON.stringify({type:'audio-ready',ready:true}));b.ws.send(JSON.stringify({type:'audio-claim'}));await a.wait(m=>m.type==='audio-output'&&m.clientId===wb.clientId);
 b.ws.close();a.messages.length=0;await a.wait(m=>m.type==='audio-output'&&m.clientId===wa.clientId);a.ws.close();
});

test('A ready Studio browser source owns sound ahead of a separate window and falls back when it closes',async t=>{
 const {url}=await setup(t),normal=await socket(url,'overlay'),studio=await socket(url,'overlay'),a=await normal.wait(m=>m.type==='welcome'),b=await studio.wait(m=>m.type==='welcome');normal.ws.send(JSON.stringify({type:'audio-ready',ready:true,playbackSync:5}));await normal.wait(m=>m.type==='audio-output'&&m.clientId===a.clientId);studio.ws.send(JSON.stringify({type:'audio-ready',ready:true,playbackSync:5,source:'studio'}));await normal.wait(m=>m.type==='audio-output'&&m.clientId===b.clientId);normal.ws.send(JSON.stringify({type:'audio-claim'}));const observer=await socket(url);assert.equal((await observer.wait(m=>m.type==='welcome')).audioOwner,b.clientId);observer.ws.close();normal.messages.length=0;studio.ws.close();await normal.wait(m=>m.type==='audio-output'&&m.clientId===a.clientId);normal.ws.close();
});
test('Static allowlist, Host checking and WebSocket Origin validation protect the local control server',async t=>{
 const {url,port}=await setup(t);
 for(const file of ['/server/app.cjs','/package.json','/node_modules/ws/package.json','/.env','/.git/config','/runtime/session.json','/%2e%2e/server/app.cjs'])assert.equal((await fetch(url+file)).status,404,file);
 assert.equal((await fetch(url+'/',{method:'POST'})).status,405);assert.equal((await fetch(url+'/health')).status,200);
 const status=await new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port,headers:{Host:'evil.test'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});assert.equal(status,421);
 await assert.rejects(socket(url,'manager','https://evil.test'),/403/);
});

test('Both HTML pages allow fetch of embedded GLB texture blobs without allowing remote connections',async t=>{
 const {url}=await setup(t);
 for(const file of ['/','/overlay.html']){
  const response=await fetch(url+file),policy=response.headers.get('content-security-policy');
  const sources=policy.split(';').map(s=>s.trim().split(/\s+/)).find(s=>s[0]==='connect-src').slice(1);
  assert.ok(sources.includes('blob:'),'ImageBitmapLoader fetch(blob:) must be allowed on '+file);
  assert.ok(!sources.some(s=>['*','https:','http:'].includes(s)),'Do not allow arbitrary remote connections');
  await response.arrayBuffer();
 }
});
test('Reconnecting a manager may resend an unacknowledged command ID without duplicate game effects',async t=>{
 const {url,app}=await setup(t),command={id:'once-only',type:'join',userId:'a',name:'An'},a=await socket(url);
 a.ws.send(JSON.stringify({type:'command',requestId:'first',command}));await a.wait(m=>m.type==='ack'&&m.requestId==='first');a.ws.terminate();
 const b=await socket(url);b.ws.send(JSON.stringify({type:'command',requestId:'replay',command}));const ack=await b.wait(m=>m.type==='ack'&&m.requestId==='replay');assert.equal(ack.result.duplicate,true);assert.equal(app.runtime.document.game.people.length,1);b.ws.close();
});

test('Native Vietnamese narration reaches the overlay as WAV with the correct MIME type and expires',async t=>{
 const {app,url}=await setup(t),overlay=await socket(url,'overlay');let now=1000;app.runtime.speech.now=()=>now;
 const audio=Buffer.alloc(48);audio.write('RIFF');audio.writeUInt32LE(40,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(22050,24);audio.writeUInt32LE(44100,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(4,40);audio.provider='windows';
 app.runtime.speech.synth=async()=>audio;app.runtime.speech.enqueue('Chào Tuất An.');const message=await overlay.wait(m=>m.type==='speech');
 assert.match(message.url,/\.wav$/);assert.equal(message.provider,'windows');const response=await fetch(url+message.url);assert.equal(response.headers.get('content-type'),'audio/wav');assert.deepEqual(Buffer.from(await response.arrayBuffer()),audio.subarray());
 assert.equal((await fetch(url+message.url.replace('.wav','.mp3'))).status,404);
 now+=300001;assert.equal((await fetch(url+message.url)).status,404);overlay.ws.close();
});

test('Audio capability follows the selected source, including legacy sources and a same-owner upgrade',async t=>{
 const {url}=await setup(t),legacy=await socket(url,'overlay');assert.equal((await legacy.wait(m=>m.type==='welcome')).playbackSync,false);
 legacy.ws.send(JSON.stringify({type:'audio-ready',ready:true}));const old=await legacy.wait(m=>m.type==='audio-output'&&m.clientId);assert.equal(old.playbackSync,false);
 legacy.ws.send(JSON.stringify({type:'audio-ready',ready:true,playbackSync:1}));const v1=await legacy.wait(m=>m.type==='audio-output'&&m.playbackSync===true);assert.equal(v1.giftPlaybackSync,false,'welcome-only clients must not suppress gift cameras');
 const observer=await socket(url,'overlay');assert.equal((await observer.wait(m=>m.type==='welcome')).playbackSync,true);legacy.ws.send(JSON.stringify({type:'audio-ready',ready:true,playbackSync:2}));await observer.wait(m=>m.type==='audio-output'&&m.giftPlaybackSync===true);
 legacy.ws.send(JSON.stringify({type:'audio-ready',ready:true}));await observer.wait(m=>m.type==='audio-output'&&m.playbackSync===false);legacy.ws.close();observer.ws.close();
});

test('A source supporting both gifts and welcomes automatically replaces a legacy source and cannot be displaced by legacy claims',async t=>{
 const {url}=await setup(t),legacy=await socket(url,'overlay'),modern=await socket(url,'overlay');
 const oldId=(await legacy.wait(m=>m.type==='welcome')).clientId,newId=(await modern.wait(m=>m.type==='welcome')).clientId;
 legacy.ws.send(JSON.stringify({type:'audio-ready',ready:true,playbackSync:1}));await legacy.wait(m=>m.type==='audio-output'&&m.clientId===oldId);
 modern.ws.send(JSON.stringify({type:'audio-ready',ready:true,playbackSync:2}));await legacy.wait(m=>m.type==='audio-output'&&m.clientId===newId&&m.giftPlaybackSync===true);
 legacy.ws.send(JSON.stringify({type:'audio-claim'}));await new Promise(r=>setTimeout(r,40));const observer=await socket(url,'overlay'),current=await observer.wait(m=>m.type==='welcome');assert.equal(current.audioOwner,newId);assert.equal(current.giftPlaybackSync,true);legacy.ws.close();modern.ws.close();observer.ws.close();
});

test('Only the selected audible client can synchronize a known welcome; viewers cannot spoof a camera target or replay it',async t=>{
 const {app,url}=await setup(t),owner=await socket(url,'overlay'),viewer=await socket(url,'overlay');app.runtime.speech.synth=async()=>Buffer.from('RIFFfixture');
 owner.ws.send(JSON.stringify({type:'audio-ready',ready:true}));await owner.wait(m=>m.type==='audio-output'&&m.clientId);
 app.runtime.speech.enqueue('Chào Tuất An.',{welcome:{personId:'An',team:'left'}});const speech=await owner.wait(m=>m.type==='speech');
 viewer.ws.send(JSON.stringify({type:'speech-playback',id:speech.id,phase:'start',duration:5,welcome:{personId:'spoof'}}));owner.ws.send(JSON.stringify({type:'speech-playback',id:'unknown',phase:'start',duration:5}));owner.ws.send(JSON.stringify({type:'speech-playback',id:speech.id,phase:'start',duration:999}));
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(viewer.messages.filter(m=>m.type==='speech-playback').length,0);
 owner.ws.send(JSON.stringify({type:'speech-playback',id:speech.id,phase:'start',duration:5,welcome:{personId:'spoof'}}));const start=await viewer.wait(m=>m.type==='speech-playback'&&m.phase==='start');assert.equal(start.welcome.personId,'An');assert.equal(start.duration,5);
 owner.ws.send(JSON.stringify({type:'speech-playback',id:speech.id,phase:'start',duration:5}));await new Promise(resolve=>setTimeout(resolve,30));assert.equal(viewer.messages.filter(m=>m.type==='speech-playback'&&m.phase==='start').length,1);
 const reload=await socket(url,'overlay');await reload.wait(m=>m.type==='snapshot');assert.equal(reload.messages.filter(m=>m.type==='speech-playback').length,0,'reload does not replay a greeting');
 owner.ws.send(JSON.stringify({type:'speech-playback',id:speech.id,phase:'end',completed:true}));const end=await viewer.wait(m=>m.type==='speech-playback'&&m.phase==='end');assert.equal(end.completed,true);
 owner.ws.close();viewer.ws.close();reload.ws.close();
});

test('A typed unaccented name preview uses stored pronunciation rules through the real WebSocket path',async t=>{
 const {app,url}=await setup(t),manager=await socket(url);let spoken;app.runtime.speech.synth=async text=>{spoken=text;return Buffer.from('RIFFfixture');};app.runtime.configure({pronunciations:[{word:'thuy',spoken:'Thúy'}]});
 manager.ws.send(JSON.stringify({type:'speak-test',requestId:'preview-name',kind:'name',text:'nguyenvanan'}));await manager.wait(m=>m.type==='speech'&&m.text.includes('Nguyễn Văn An'));assert.equal(spoken,'Chào Tuất Nguyễn Văn An.');
 manager.ws.send(JSON.stringify({type:'speak-test',requestId:'bad-preview',text:'a'.repeat(241)}));await manager.wait(m=>m.type==='error'&&m.requestId==='bad-preview');manager.ws.close();
});


test('Only actual phase audio onset from the selected source starts the full preparation timer',async t=>{
 const {app,url}=await setup(t),owner=await socket(url,'overlay'),other=await socket(url,'overlay');let now=Date.now();app.runtime.now=()=>now;app.runtime.speech.synth=async()=>Buffer.from('RIFFphase');app.runtime.speech.prepared.clear();app.runtime.command({id:'phase-settings',type:'settings',values:{prepareSeconds:15}});app.runtime.configure({voiceEnabled:true,readRounds:true});
 owner.ws.send(JSON.stringify({type:'audio-ready',ready:true,playbackSync:4}));await owner.wait(m=>m.type==='audio-output'&&m.clientId);app.runtime.command({id:'phase-start',type:'start'});
 const speech=await owner.wait(m=>m.type==='speech'&&m.roundPhase);assert.equal(speech.roundPhase.phase,'prepare');assert.equal(app.runtime.document.game.remaining,15);assert.ok(app.runtime.document.game.preparationVoice);
 now+=5000;app.runtime.tick();assert.equal(app.runtime.document.game.remaining,15);other.ws.send(JSON.stringify({type:'speech-playback',id:speech.id,phase:'start',duration:3}));await new Promise(r=>setTimeout(r,30));assert.ok(app.runtime.document.game.preparationVoice,'non-owner cannot release countdown');
 owner.ws.send(JSON.stringify({type:'speech-playback',id:speech.id,phase:'start',duration:3}));await other.wait(m=>m.type==='speech-playback'&&m.id===speech.id&&m.phase==='start');assert.equal(app.runtime.document.game.preparationVoice,undefined);assert.equal(app.runtime.document.game.phaseEnd,now+15000);
 const deadline=app.runtime.document.game.phaseEnd;owner.ws.send(JSON.stringify({type:'speech-playback',id:speech.id,phase:'start',duration:3}));await new Promise(r=>setTimeout(r,30));assert.equal(app.runtime.document.game.phaseEnd,deadline);now=deadline;app.runtime.tick();assert.equal(app.runtime.document.game.phase,'battle');owner.ws.close();other.ws.close();
});


test('Production autoRun starts itself and repeats full preparation, two-minute battle and three-minute empty-court breaks without manager commands',async t=>{
 const {Store}=require('../server/store.cjs'),{Runtime}=require('../server/runtime.cjs'),{Speech}=require('../server/speech.cjs'),E=require('../src/live-engine.js'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-auto-cycle-'));let now=10000;
 const store=new Store(directory);store.acquire();const runtime=new Runtime({store,now:()=>now,speech:new Speech({synth:async()=>Buffer.from('test')}),sessionFactory:()=>({state:{status:'idle'},disconnect:async()=>{}})});runtime.configure({voiceEnabled:false});for(let i=0;i<12;i++)runtime.command({id:'auto-person-'+i,type:'join',userId:'p'+i,name:'Bạn '+i});const app=createApp({runtime,autoRun:true,port:0});await app.listen();t.after(async()=>{await app.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-auto-cycle-')));fs.rmSync(directory,{recursive:true,force:true});});
 await new Promise(r=>setTimeout(r,350));let g=runtime.document.game;assert.equal(g.phase,'prepare');assert.equal(g.remaining,15);assert.equal(g.fighters.filter(f=>!f.bot).length,10);now+=15000;runtime.tick();g=runtime.document.game;assert.equal(g.phase,'battle');assert.equal(g.remaining,120);now+=60000;for(const p of runtime.document.game.people)runtime.command({id:'present-'+p.id,type:'comment',userId:p.id,text:'có mặt'});now+=60000;runtime.tick();g=runtime.document.game;assert.equal(g.phase,'break');assert.equal(g.remaining,180);assert.equal(E.sceneRoster(g).fighters.length,0);assert.equal(E.sceneRoster(g).waiting.filter(p=>p.bot).length,10);now+=60000;for(const p of runtime.document.game.people)runtime.command({id:'break-present-'+p.id,type:'comment',userId:p.id,text:'vẫn có mặt'});now+=120000;runtime.tick();g=runtime.document.game;assert.equal(g.phase,'prepare');assert.equal(g.round,2);assert.equal(g.fighters.filter(f=>!f.bot).length,10);assert.equal(g.history.length,1);
});

