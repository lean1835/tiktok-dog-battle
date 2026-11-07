const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../server/store.cjs'),{Runtime}=require('../server/runtime.cjs'),{Speech}=require('../server/speech.cjs');
function fixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-runtime-'));let now=10000;
 const store=new Store(directory);store.acquire();
 const make=store=>new Runtime({store,now:()=>now,speech:new Speech({synth:async()=>Buffer.from('test MP3')}),sessionFactory:()=>({state:{status:'idle'},disconnect:async()=>{},connect:async()=>{}})});
 const runtime=make(store);
 runtime.command({id:'fixture-demo',type:'settings',values:{demoFill:true,prepareSeconds:0}});
 t.after(async()=>{try{await runtime.close();}catch{}assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-runtime-')));fs.rmSync(directory,{recursive:true,force:true});});
 const raw=(overrides={})=>({common:{msgId:'gift-1'},user:{id:'u1',nickname:'Na'},giftId:99,gift:{type:1,name:'Rose',diamondCount:1},groupId:'combo1',repeatCount:3,repeatEnd:1,...overrides});
 return{runtime,store,directory,make,raw,advance:ms=>now+=ms};
}

test('Welcomes cover saved viewers and consecutive new entries, with room-scoped repeat protection',t=>{
 const f=fixture(t),calls=[];f.runtime.configure({voiceEnabled:true,readJoins:true});f.runtime.speech.enqueue=(text,options)=>{calls.push({text,...options});return true;};
 f.runtime.command({type:'join',id:'saved-viewer',userId:'tt:old',name:'An',team:'left'});
 const enter=(id,msg,room='r')=>f.runtime.ingest('member',{common:{msgId:msg},user:{id,nickname:id==='old'?'An':id}},room);
 enter('old','one');enter('Na','two');enter('Bình','three');assert.equal(calls.length,3,'all three entries get a welcome, including a saved viewer');assert.ok(calls.every(c=>c.text.includes('Tuất ')));
 enter('old','again');assert.equal(calls.length,4,'a new member event welcomes reentry immediately');enter('old','again');assert.equal(calls.length,4,'the same TikTok event never repeats');enter('old','other-room','new-room');assert.equal(calls.length,5);
 f.advance(60001);enter('old','later');assert.equal(calls.length,6);
});

test('Welcomes vary through a full shuffled cycle, keep prepared names and do not consume rejected entries',t=>{
 const f=fixture(t),calls=[];f.runtime.configure({voiceEnabled:true,readJoins:true});
 const event={kind:'join',userId:'same-name',name:'nguyenvanan'};
 f.runtime.speech.enqueue=()=>false;assert.equal(f.runtime.narrate(event,'r'),false);
 f.runtime.speech.enqueue=(text,options)=>{calls.push({text,...options});return true;};
 assert.equal(f.runtime.narrate(event,'r'),true);assert.equal(f.runtime.narrate(event,'r'),false);
 for(let i=1;i<36;i++)f.runtime.narrate({...event,userId:'viewer-'+i},'r');
 assert.equal(calls.length,36);
 for(let start=0;start<36;start+=12)assert.equal(new Set(calls.slice(start,start+12).map(c=>c.text)).size,12,'each cycle uses all twelve greetings');
 for(let i=1;i<calls.length;i++)assert.notEqual(calls[i].text,calls[i-1].text,'no repeat at cycle boundaries');
 assert.ok(calls.every(c=>c.text.includes('Tuất Nguyễn Văn An')&&c.priority===0&&c.protectedTexts.includes('Nguyễn Văn An')));
 f.runtime.configure({readJoins:false});assert.equal(f.runtime.narrate({...event,userId:'muted'},'r'),false);assert.equal(calls.length,36);
});

test('Manager demo join/gift narration is explicit, respects switches and never repeats a replayed command',t=>{
 const f=fixture(t),calls=[];f.runtime.configure({voiceEnabled:true,readJoins:true,readGifts:true});f.runtime.speech.enqueue=(text,options)=>{calls.push({text,...options});return true;};
 const join={type:'join',id:'demo-hello',announce:true,userId:'demo-person',name:'Na',team:'left'};f.runtime.command(join);assert.equal(calls.length,1);assert.match(calls[0].text,/Tuất Na/);f.runtime.command(join);assert.equal(calls.length,1);
 const gift={type:'gift',id:'demo-gift',announce:true,userId:'demo-person',name:'Na',team:'left',gift:'rose',count:2};f.runtime.command(gift);assert.equal(calls.length,2);assert.match(calls[1].text,/Cảm ơn Tuất Na/);assert.equal(calls[1].priority,1);f.runtime.command(gift);assert.equal(calls.length,2);
 f.runtime.configure({voiceEnabled:false});f.runtime.command({...gift,id:'muted-demo'});assert.equal(calls.length,2);f.runtime.configure({voiceEnabled:true});f.runtime.command({...gift,id:'silent-setup',announce:false});assert.equal(calls.length,2);
});

test('Narration covers preparation, start, manual results, follow/share and the actual gift effect with prepared names',async t=>{
 const f=fixture(t),calls=[];f.runtime.configure({voiceEnabled:true,readJoins:true,readGifts:true,readRounds:true,readSocial:true,readWinner:true,pronunciations:[{word:'thuy',spoken:'Thúy'}]});f.runtime.speech.enqueue=(text,options)=>{calls.push({text,...options});return true;};
 f.runtime.command({type:'settings',id:'intro-settings',values:{prepareSeconds:15}});f.runtime.command({type:'start',id:'intro-start'});assert.match(calls.at(-1).text,/15 giây chuẩn bị/);f.advance(15000);f.runtime.tick();assert.match(calls.at(-1).text,/Trận 1 bắt đầu/);const count=calls.length;f.runtime.tick();assert.equal(calls.length,count);f.runtime.command({type:'pause',id:'voice-pause'});assert.match(calls.at(-1).text,/tạm dừng/);f.runtime.command({type:'pause',id:'voice-resume'});assert.match(calls.at(-1).text,/Tiếp tục/);
 f.runtime.ingest('follow',{common:{msgId:'follow-one'},user:{id:'name',nickname:'minhngoc'}},'r');assert.match(calls.at(-1).text,/Minh Ngọc.*theo dõi/);f.runtime.ingest('share',{common:{msgId:'share-one'},user:{id:'name',nickname:'minhngoc'}},'r');assert.match(calls.at(-1).text,/Minh Ngọc.*chia sẻ/);
 const actor=f.runtime.document.game.people.find(p=>p.id==='tt:name');f.runtime.command({type:'gift',id:'gift-voice',announce:true,userId:actor.id,name:actor.name,gift:'dragon'});assert.match(calls.at(-1).text,/Minh Ngọc/);assert.match(calls.at(-1).text,/hóa rồng.*vĩnh viễn/);
 f.runtime.command({type:'next',id:'manual-result'});assert.match(calls.at(-1).text,/hòa nhau|chiến thắng/);assert.match(calls.at(-1).text,/Vinh danh Tuất Vương/);assert.equal(calls.at(-1).priority,3);assert.equal(calls.at(-1).honorId,f.runtime.document.game.result.id);const n=calls.length;f.runtime.command({type:'next',id:'manual-result'});assert.equal(calls.length,n);
});
test('Final combo, restart and replay preserve exactly one coin credit, including finals with changed message IDs',async t=>{
 const f=fixture(t);const first=f.raw();assert.equal(f.runtime.ingest('gift',{...first,repeatEnd:0},'room').ignored,true);
 assert.equal(f.runtime.ingest('gift',first,'room').applied,true);assert.equal(f.runtime.document.game.people[0].coins,3);
 assert.equal(f.runtime.ingest('gift',{...first,common:{msgId:'other-final'}},'room').duplicate,true);
 const second=f.make(new Store(f.directory));assert.equal(second.ingest('gift',first,'room').duplicate,true);assert.equal(second.document.game.people[0].coins,3);assert.equal(second.document.metrics.coins,3);
});
test('Chat autojoins as neutral, preserves assigned breed and cannot unlock dragon for free',t=>{
 const f=fixture(t);f.runtime.ingest('chat',{common:{msgId:'a'},user:{id:'a',nickname:'An'},comment:'xanh'},'r');
 assert.equal(f.runtime.document.game.people[0].team,null);f.runtime.ingest('chat',{common:{msgId:'b'},user:{id:'b',nickname:'Bình'},comment:'shiba'},'r');
 assert.equal(f.runtime.document.game.people[1].team,null);const breed=f.runtime.document.game.people[1].breed;assert.ok(breed);f.runtime.ingest('chat',{common:{msgId:'b2'},user:{id:'b',nickname:'Bình'},comment:'corgi'},'r');assert.equal(f.runtime.document.game.people[1].breed,breed);
 f.runtime.command({id:'start',type:'start'});f.runtime.ingest('chat',{common:{msgId:'c'},user:{id:'b',nickname:'Bình'},comment:'dragon'},'r');
 assert.equal(f.runtime.document.game.fighters.find(p=>p.id==='tt:b').form,'dog');
});
test('A 250-gift combo uses actual coins; a paid gift while paused queues until resume',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false,giftRules:[{giftId:'99',name:'Rồng',aliases:[],skill:'dragon',unitCoins:99}]});f.runtime.command({id:'start',type:'start'});
 f.runtime.command({id:'pause',type:'pause'});f.runtime.ingest('gift',f.raw({repeatCount:250,gift:{type:1,name:'Real Gift',diamondCount:2}}),'r');
 assert.equal(f.runtime.document.metrics.coins,500);assert.equal(f.runtime.document.pendingGifts.length,1);assert.equal(f.runtime.document.game.people[0].coins,0);
 f.runtime.command({id:'resume',type:'pause'});assert.equal(f.runtime.document.pendingGifts.length,0);assert.equal(f.runtime.document.game.people[0].coins,500);
 assert.ok(f.runtime.document.game.fighters.every(p=>p.form==='dog'));assert.equal(f.runtime.document.game.people.find(p=>p.id==='tt:u1').permanentForm,'dragon');
});
test('Restart pauses an unfinished battle and keeps remaining time, settings and command dedupe',t=>{
 const f=fixture(t);f.runtime.command({id:'settings',type:'settings',values:{baseDamage:10}});f.runtime.command({id:'start',type:'start'});f.advance(60000);f.runtime.tick();
 const restored=f.make(new Store(f.directory));assert.equal(restored.document.game.paused,true);assert.equal(restored.document.game.remaining,60);assert.equal(restored.document.game.config.baseDamage,10);assert.equal(restored.command({id:'start',type:'start'}).duplicate,true);
});
test('A failed disk write cannot consume a gift receipt or acknowledge an unsaved command',t=>{
 const f=fixture(t);const save=f.store.save.bind(f.store);f.store.save=()=>{throw new Error('disk full');};
 assert.throws(()=>f.runtime.ingest('gift',f.raw(),'r'),/disk full/);assert.equal(f.runtime.document.receipts.gift.length,0);assert.equal(f.runtime.document.metrics.coins,0);assert.ok(f.runtime.fault);f.store.save=save;
});

test('A burst of free hearts updates immediately but coalesces disk writes; a paid gift persists the entire pending batch',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});const save=f.store.save.bind(f.store);let writes=0;f.store.save=d=>{writes++;save(d);};
 for(let i=0;i<100;i++)f.runtime.ingest('like',{user:{id:'fast',nickname:'An'},common:{msgId:'fast-'+i},likeCount:3},'r');assert.equal(f.runtime.document.metrics.like,300);assert.equal(writes,0);assert.ok(f.runtime.freeSaveTimer);f.runtime.flushFreeInteractions();assert.equal(writes,1);assert.equal(new Store(f.directory).load().metrics.like,300);
 f.runtime.ingest('like',{user:{id:'fast',nickname:'An'},common:{msgId:'last-free'},likeCount:7},'r');f.runtime.ingest('gift',f.raw(),'r');const saved=new Store(f.directory).load();assert.equal(saved.metrics.like,307);assert.equal(saved.metrics.coins,3);assert.equal(f.runtime.freeSaveTimer,null);assert.equal(writes,2);
});
test('Atomic backup recovery preserves data and a live process lock prevents a second writer',t=>{
 const f=fixture(t);f.runtime.command({id:'one',type:'join',userId:'first',name:'An'});f.runtime.command({id:'two',type:'join',userId:'second',name:'Bình'});
 assert.throws(()=>new Store(f.directory).acquire(),/khác đang dùng/);fs.writeFileSync(f.store.file,'corrupted');const recover=new Store(f.directory),doc=recover.load();assert.equal(recover.recovered,true);assert.equal(doc.game.people.length,1);recover.save(doc);assert.ok(new Store(f.directory).load());
});

test('Legacy migration retains settings and achievement history but refuses to overwrite an existing server session',t=>{
 const f=fixture(t),E=require('../src/live-engine.js'),source=E.create();E.dispatch(source,{id:'settings',type:'settings',values:{baseDamage:19}});E.dispatch(source,{id:'join',type:'join',userId:'legacy',name:'An'});source.people[0].wins=7;
 const result=f.runtime.importLegacy(source);assert.equal(result.people,1);assert.equal(f.runtime.document.game.people[0].wins,7);assert.equal(f.runtime.document.game.config.baseDamage,19);assert.equal(f.runtime.document.game.phase,'ready');assert.throws(()=>f.runtime.importLegacy(source),/ghi đè/);
});

test('Large rooms admit new viewers and credit gifts without evicting earlier people',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});f.runtime.transact(d=>{for(let i=0;i<600;i++)d.game.people.push({id:'full-'+i,name:'Waiting',team:null,waitingSince:100,priorityCoins:0,coins:0});});
 f.runtime.ingest('gift',f.raw(),'r');assert.equal(f.runtime.document.pendingGifts.length,0);assert.equal(f.runtime.document.game.people.length,601);assert.equal(f.runtime.document.game.people.find(p=>p.id==='tt:u1').coins,3);assert.ok(f.runtime.document.game.people.some(p=>p.id==='full-0'));
});

test('Real TikTok like/chat payloads bark for the correct viewer, dedupe replays and retain every received heart',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});const raw={common:{msgId:'heart-1'},user:{id:'a',nickname:'An'},likeCount:30};
 f.runtime.ingest('like',raw,'r');let game=f.runtime.document.game;assert.equal(game.events.at(-1).kind,'bark');assert.equal(game.events.at(-1).actor,'tt:a');assert.equal(game.events.at(-1).spectator,true);assert.equal(f.runtime.document.metrics.like,30);
 assert.equal(f.runtime.ingest('like',raw,'r').duplicate,true);f.runtime.command({id:'start-like',type:'start'});f.advance(1500);
 f.runtime.ingest('chat',{common:{msgId:'gau-1'},user:raw.user,comment:'Gâu!'},'r');game=f.runtime.document.game;const barks=()=>game.events.filter(e=>e.kind==='bark');assert.equal(barks().at(-1).damage,0);assert.equal(barks().at(-1).points,8);assert.equal(barks().at(-1).source,'comment');
 const n=barks().length;f.advance(200);f.runtime.ingest('like',{...raw,common:{msgId:'heart-2'},likeCount:12},'r');game=f.runtime.document.game;assert.equal(barks().length,n+1);assert.equal(f.runtime.document.metrics.like,42);
 f.advance(1300);f.runtime.ingest('like',{...raw,common:{msgId:'heart-3'},likeCount:100},'r');game=f.runtime.document.game;assert.equal(barks().length,n+2);assert.equal(barks().at(-1).source,'like');assert.equal(barks().at(-1).damage,0);assert.equal(game.points.left,904);assert.equal(f.runtime.document.metrics.like,142);
});

test('Ordinary TikTok chat is persisted for the sender and a replay does not extend its bubble lifetime',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});const raw={common:{msgId:'bubble-1'},user:{id:'chat-user',nickname:'Na'},comment:'Chào cả xóm 😄'};f.runtime.ingest('chat',raw,'r');
 const p=f.runtime.document.game.people.find(p=>p.id==='tt:chat-user');assert.equal(p.chat.text,raw.comment);const at=p.chat.at;f.advance(1000);assert.equal(f.runtime.ingest('chat',raw,'r').duplicate,true);assert.equal(f.runtime.document.game.people.find(p=>p.id==='tt:chat-user').chat.at,at);assert.equal(f.runtime.document.metrics.chat,1);
 const saved=JSON.parse(fs.readFileSync(f.store.file,'utf8'));assert.equal(saved.game.people.find(p=>p.id==='tt:chat-user').chat.text,raw.comment);
});

test('Permanent forms and the remaining skill cooldown survive restart without offline-time catch-up',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});f.runtime.command({id:'join-dragon',type:'join',userId:'dragon',name:'Na',team:'left'});f.runtime.command({id:'start-dragon',type:'start'});f.runtime.command({id:'upgrade-dragon',type:'gift',userId:'dragon',gift:'dragon'});f.advance(10000);f.runtime.tick();
 const restored=f.make(new Store(f.directory)),fighter=()=>restored.document.game.fighters.find(p=>p.id==='dragon');assert.equal(restored.document.game.paused,true);assert.equal(restored.document.game.people.find(p=>p.id==='dragon').permanentForm,'dragon');assert.equal(fighter().skillRemaining,20000);
 f.advance(120000);restored.command({id:'resume-dragon',type:'pause'});const ready=fighter().skillReadyAt,hp=restored.document.game.fighters.filter(p=>p.team==='right').reduce((v,p)=>v+p.hp,0);f.advance(19999);restored.tick();assert.equal(restored.document.game.fighters.filter(p=>p.team==='right').reduce((v,p)=>v+p.hp,0),hp);f.advance(1);restored.tick();assert.ok(restored.document.game.events.some(e=>e.kind==='skill'&&e.actor==='dragon'));assert.equal(fighter().skillReadyAt,ready+30000);
});


test('Real room rank snapshots select and balance contributors, preserve roster mid-round and survive restart',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});
 for(let i=0;i<12;i++)f.runtime.ingest('member',{common:{msgId:'join-'+i},user:{id:'rank-'+i,nickname:'Người '+i}},'r');
 assert.ok(f.runtime.document.game.people.every(p=>p.team===null));
 const rows=Array.from({length:12},(_,i)=>({user:{id:'rank-'+i,nickname:'Người '+i},rank:String(i+1),score:String(i<4?[100,90,20,10][i]:0)}));
 f.runtime.ingest('roomUser',{total:'123',ranks:rows},'r');assert.equal(f.runtime.viewers,123);assert.equal(f.runtime.document.metrics.coins,0);assert.ok(f.runtime.document.game.people.every(p=>p.coins===0));
 f.runtime.command({id:'rank-start',type:'start'});const g=f.runtime.document.game;assert.equal(g.fighters.filter(p=>p.bot).length,0);assert.deepEqual(g.fighters.map(p=>p.id).sort(),rows.slice(0,10).map(p=>'tt:'+p.user.id).sort());
 const total=t=>g.fighters.filter(p=>p.team===t).reduce((n,p)=>n+g.people.find(x=>x.id===p.id).liveContribution,0);assert.equal(total('left'),110);assert.equal(total('right'),110);
 const roster=g.fighters.map(p=>[p.id,p.team,p.breed]);f.runtime.ingest('roomUser',{viewerCount:130,ranks:rows.slice().reverse().map((r,i)=>({...r,rank:String(i+1)}))},'r');assert.deepEqual(f.runtime.document.game.fighters.map(p=>[p.id,p.team,p.breed]),roster);
 const copy=f.make(new Store(f.directory));assert.deepEqual(copy.document.game.fighters.map(p=>[p.id,p.team,p.breed]),roster);assert.ok(copy.document.game.people.filter(p=>!roster.some(([id])=>id===p.id)).every(p=>p.team===null));
 f.runtime.ingest('roomUser',{total:15,ranks:[]},'r');assert.ok(f.runtime.document.game.people.every(p=>p.liveRank===undefined));
});


test('LIVE counts and room changes never displace humans still within their three-minute patio presence',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});for(let i=0;i<20;i++)f.runtime.command({type:'join',id:'old-'+i,userId:'past-'+i,name:'Đã lưu'});
 f.runtime.tiktok.state.status='connected';for(let i=0;i<5;i++)f.runtime.ingest('member',{common:{msgId:'current-'+i},user:{id:'live-'+i,nickname:'Trong phòng'}},'current-room');
 f.runtime.ingest('roomUser',{total:3},'current-room');assert.equal(f.runtime.document.game.liveAudience.viewers,3);f.runtime.ingest('roomUser',{ranks:[]},'current-room');assert.equal(f.runtime.document.game.liveAudience.viewers,3,'rank-only packets retain the last known room count');f.runtime.command({type:'start',id:'small-live'});assert.equal(f.runtime.document.game.fighters.filter(f=>f.bot).length,0);assert.equal(f.runtime.document.game.fighters.filter(f=>!f.bot).length,10);assert.equal(f.runtime.document.game.people.length,25);
});


test('Three-minute inactivity expires quiet viewers; rank snapshots do not count as interaction and reentry restores them',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});const enter=id=>f.runtime.ingest('member',{user:{id,nickname:id},common:{msgId:'join-'+id+'-'+Date.now()}},'r');enter('quiet');enter('gone');
 f.runtime.ingest('leave',{user:{id:'gone'},common:{msgId:'left'}},'r');const at=f.runtime.document.game.people.find(p=>p.id==='tt:gone').leftAt;
 f.advance(179999);f.runtime.tick();assert.ok(!f.runtime.document.game.people.find(p=>p.id==='tt:gone').hiddenAt);f.runtime.ingest('roomUser',{ranks:[],total:1},'r');assert.equal(f.runtime.document.game.people.find(p=>p.id==='tt:gone').leftAt,at);
 f.advance(1);f.runtime.tick();assert.ok(f.runtime.document.game.people.find(p=>p.id==='tt:gone').hiddenAt);assert.ok(f.runtime.document.game.people.find(p=>p.id==='tt:quiet').hiddenAt);enter('gone');assert.equal(f.runtime.document.game.people.find(p=>p.id==='tt:gone').hiddenAt,undefined);
});


test('All viewer interaction types revive dormant viewers, welcome once, and reset only their own inactivity timer',t=>{
 const f=fixture(t),calls=[];f.runtime.configure({voiceEnabled:true,readJoins:true,readGifts:true,readSocial:true});f.runtime.speech.enqueue=(text,options)=>{calls.push({text,...options});return true;};
 const kinds=['chat','like','gift','follow','share','member'];for(const kind of kinds)f.runtime.ingest('member',{user:{id:kind,nickname:'An'},common:{msgId:'enter-'+kind}},'r');const original=f.runtime.document.game.people.map(p=>[p.id,p.breed]);
 f.advance(180000);f.runtime.tick();assert.ok(f.runtime.document.game.people.every(p=>p.hiddenAt));calls.length=0;
 for(const kind of kinds){const raw={user:{id:kind,nickname:'An'},common:{msgId:'back-'+kind},comment:'xin chào',likeCount:1,...(kind==='gift'?{giftId:'5655',gift:{name:'Rose',diamondCount:1},repeatCount:1}: {})};f.runtime.ingest(kind,raw,'r');const p=f.runtime.document.game.people.find(p=>p.id==='tt:'+kind);assert.equal(p.hiddenAt,undefined);assert.equal(p.lastInteractionAt,190000);assert.equal(p.breed,original.find(([id])=>id===p.id)[1]);const read=calls.at(-1);assert.ok(read.text.includes('Tuất An'));if(['gift','follow','share'].includes(kind))assert.ok((read.text.match(/Tuất An/g)||[]).length>=2,'combined clip includes greeting plus gratitude');assert.ok(read.welcome||read.presentation,'greeting has synchronized camera metadata');assert.equal(calls.length,kinds.indexOf(kind)+1,'gift/social gratitude and welcome share a single clip');f.runtime.ingest(kind,raw,'r');assert.equal(calls.length,kinds.indexOf(kind)+1,'replayed interactions cannot greet or refresh twice');}
 f.advance(179999);f.runtime.tick();assert.ok(f.runtime.document.game.people.every(p=>!p.hiddenAt));f.advance(1);f.runtime.tick();assert.ok(f.runtime.document.game.people.every(p=>p.hiddenAt));
});

test('Repeated room rankings and automatic barks never extend a viewer’s three-minute activity deadline',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});f.runtime.ingest('member',{user:{id:'ranked',nickname:'An'},common:{msgId:'ranked-enter'}},'r');f.runtime.command({id:'auto-round',type:'start'});
 for(let i=0;i<5;i++){f.advance(50000);f.runtime.ingest('roomUser',{total:1,ranks:[{user:{id:'ranked',nickname:'An'},rank:1,score:99}]},'r');f.runtime.tick();}assert.equal(f.runtime.document.game.people[0].lastInteractionAt,10000);f.advance(50000);f.runtime.tick();assert.ok(f.runtime.document.game.people[0].hiddenAt);
});


test('Returning gift/social viewers still get a greeting when gift/social reads are off; readJoins off stays respected',t=>{
 const f=fixture(t),calls=[];f.runtime.configure({voiceEnabled:true,readJoins:true,readGifts:false,readSocial:false});f.runtime.speech.enqueue=(text,options)=>{calls.push({text,...options});return true;};f.runtime.ingest('member',{user:{id:'again',nickname:'An'},common:{msgId:'initial'}},'r');f.advance(180000);f.runtime.tick();calls.length=0;
 f.runtime.ingest('gift',{user:{id:'again',nickname:'An'},common:{msgId:'gift-back'},giftId:'5655',gift:{name:'Rose',diamondCount:1},repeatCount:1},'r');assert.equal(calls.length,1);assert.equal(calls[0].welcome.personId,'tt:again');assert.doesNotMatch(calls[0].text,/Cảm ơn/);
 f.advance(180000);f.runtime.tick();calls.length=0;f.runtime.ingest('share',{user:{id:'again',nickname:'An'},common:{msgId:'share-back'}},'r');assert.equal(calls.length,1);assert.equal(calls[0].welcome.personId,'tt:again');f.runtime.configure({readJoins:false});f.advance(180000);f.runtime.tick();calls.length=0;f.runtime.ingest('like',{user:{id:'again',nickname:'An'},common:{msgId:'heart-back'},likeCount:1},'r');assert.equal(calls.length,0);assert.equal(f.runtime.document.game.people[0].hiddenAt,undefined);
});


test('Reset requires explicit confirmation, backs up all data and preserves config, channel and paid-event replay guards',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false,username:'hannin2002'});f.runtime.ingest('gift',f.raw(),'room');f.runtime.command({id:'reset-test-start',type:'start'});const before=structuredClone(f.runtime.document),epoch=before.game.createdAt;
 assert.throws(()=>f.runtime.command({id:'bad-reset',type:'reset',confirm:'no',expectedCreatedAt:epoch}),/RESET/);assert.equal(f.runtime.document.game.people.length,1);
 const result=f.runtime.command({id:'confirmed-reset',type:'reset',confirm:'RESET',expectedCreatedAt:epoch});assert.equal(result.applied,true);const backup=JSON.parse(fs.readFileSync(path.join(f.directory,result.backup),'utf8'));assert.deepEqual(backup,before);const d=f.runtime.document;assert.equal(d.game.people.length,0);assert.equal(d.game.history.length,0);assert.equal(d.game.fighters.length,0);assert.equal(d.game.phase,'ready');assert.equal(d.game.round,0);assert.deepEqual(d.game.config,before.game.config);assert.equal(d.liveConfig.username,'hannin2002');assert.equal(d.metrics.coins,0);assert.equal(f.runtime.ingest('gift',f.raw(),'room').duplicate,true);assert.equal(f.runtime.command({id:'confirmed-reset',type:'reset',confirm:'RESET',expectedCreatedAt:epoch}).duplicate,true);
});

test('A failed reset backup leaves the session untouched',t=>{
 const f=fixture(t),before=structuredClone(f.runtime.document);f.runtime.store.backup=()=>{throw new Error('backup unavailable');};assert.throws(()=>f.runtime.command({id:'fail-reset',type:'reset',confirm:'RESET',expectedCreatedAt:before.game.createdAt}),/backup unavailable/);assert.deepEqual(f.runtime.document,before);
});
test('Copy-on-write likes match full transactions, preserve earlier snapshots and keep every paid gift durable',t=>{
 const savedRandom=Math.random;Math.random=()=>.25;t.after(()=>{Math.random=savedRandom;});const fast=fixture(t),reference=fixture(t),full=reference.runtime.transact.bind(reference.runtime);reference.runtime.transact=(change,options={})=>full(change,{...options,freeActorId:undefined});
 for(const f of [fast,reference]){f.runtime.configure({voiceEnabled:false});f.runtime.transact(d=>{const E=require('../src/live-engine.js');for(let i=0;i<80;i++){E.dispatch(d.game,{id:'seed-'+i,type:'join',userId:'tt:p'+i,name:'Bạn '+i},10000);d.game.people.at(-1).waitingSince=10000+i;}E.dispatch(d.game,{id:'start',type:'start'},10000,()=>.5);});}
 const clean=d=>{const copy=structuredClone(d);delete copy.game.processed;for(const p of copy.game.people)if(p.chat)delete p.chat.id;return copy;};
 for(let i=0;i<180;i++){const raw={common:{msgId:'copy-on-write-'+i},user:{id:'p'+i%80,nickname:'Bạn '+i%80},likeCount:i%9+1};const previous=fast.runtime.document,before=structuredClone(previous);for(const f of [fast,reference])f.runtime.ingest('like',raw,'room');assert.deepEqual(previous,before,'an emitted earlier snapshot must not be mutated');if(i%31===0)for(const f of [fast,reference]){f.runtime.ingest('gift',f.raw({common:{msgId:'paid-'+i},user:{id:'p0',nickname:'Bạn 0'},groupId:'combo-'+i}),'room');assert.equal(f.runtime.freeSaveTimer,null,'paid commit flushes pending free changes');}assert.deepEqual(clean(fast.runtime.document),clean(reference.runtime.document));}
 for(const f of [fast,reference])f.runtime.flushFreeInteractions();assert.equal(fast.runtime.document.metrics.like,reference.runtime.document.metrics.like);assert.equal(fast.runtime.document.metrics.coins,reference.runtime.document.metrics.coins);
});

test('Failed copy-on-write changes leave actor, expired viewers, fighters, points and receipts untouched',t=>{
 const f=fixture(t);f.runtime.configure({voiceEnabled:false});f.runtime.command({id:'join-a',type:'join',userId:'a',name:'An'});f.runtime.command({id:'join-b',type:'join',userId:'b',name:'Bình'});f.advance(181000);const original=f.runtime.document,before=structuredClone(original);
 assert.throws(()=>f.runtime.transact(d=>{d.game.people.find(p=>p.id==='a').like=99;d.game.people.find(p=>p.id==='b').hiddenAt=999;d.game.points.left=99;d.metrics.like=99;d.receipts.other.push('not-committed');throw Error('abort');},{deferFreeInteraction:true,freeActorId:'a'}),/abort/);assert.deepEqual(original,before);assert.equal(f.runtime.document,original);
});
