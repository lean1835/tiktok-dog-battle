const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../src/live-engine.js');
const moduleReady=import('../src/live-camera.mjs');
const state=()=>({phase:'battle',paused:false,config:{},events:[]});
const event=(id,kind,at,extra={})=>({id,kind,at,personId:'new-viewer',...extra});

test('Periodic orbit starts every fifteen seconds; barks never request old cameras',async()=>{
 const {LiveCameraDirector}=await moduleReady,d=new LiveCameraDirector(),s=state();d.consume(s,10000);
 for(const at of [10100,20000,24999]){s.events.push(event('bark-'+at,'bark',at));assert.equal(d.consume(s,at),null);}
 const shot=d.consume(s,25000);assert.equal(shot.kind,'orbit');assert.equal(shot.duration,8000);assert.equal(d.sample(25000).amount,0);assert.equal(d.sample(26200).amount,1);assert.equal(d.sample(33000),null);assert.equal(d.consume(s,39999),null);assert.equal(d.consume(s,40000).kind,'orbit');assert.equal(d.active.direction,-shot.direction);
});

test('Welcomes and gifts retain event priority, speech synchronization, close zoom and 650/850 ms easing',async()=>{
 const {LiveCameraDirector}=await moduleReady,d=new LiveCameraDirector(),s=state();d.consume(s,10000);s.events.push(event('join','join',10100));const welcome=d.consume(s,10100);assert.equal(welcome.kind,'welcome');assert.equal(welcome.zoom,3.1);assert.equal(d.sample(10750).amount,1);
 s.events.push(event('gift','gift',10800,{gift:'rose',coins:1}));assert.equal(d.consume(s,10800).kind,'gift');d.sample(20000);
 s.events.push(event('spoken','join',21000));assert.equal(d.consume(s,21000,{deferWelcomes:true}),null);const voice=d.spokenWelcome({personId:'Na'},23000,5.2,'speech');assert.equal(voice.ends,29050);assert.equal(d.sample(28200).amount,1);assert.equal(d.sample(29050),null);
});

test('Spoken gifts and welcomes preempt an orbit immediately and an orbit cannot interrupt their sentence',async()=>{
 const {LiveCameraDirector}=await moduleReady,d=new LiveCameraDirector(),s=state();d.consume(s,10000);d.consume(s,25000);const gift=d.spokenPresentation('gift',{personId:'donor'},26000,35,'thanks');assert.equal(gift.zoom,2.8);assert.equal(d.active.speechId,'thanks');for(const due of [40000,55000]){assert.equal(d.consume(s,due),null);assert.equal(d.active.speechId,'thanks');}
 d.sample(gift.ends);assert.equal(d.consume(s,70000).kind,'orbit');s.events.push(event('join','join',70100));assert.equal(d.consume(s,70100).kind,'welcome');
});

test('Preparation, pause, disabled/reduced motion and the honor board suppress periodic orbit without a catch-up burst',async()=>{
 const {LiveCameraDirector}=await moduleReady;
 for(const mode of ['prepare','pause','off','reduced','honor']){const d=new LiveCameraDirector(),s=state();d.consume(s,10000);if(mode==='prepare')s.phase='prepare';if(mode==='pause')s.paused=true;if(mode==='off')s.config.cameraEnabled=false;if(mode==='honor'){s.phase='break';s.result={at:39000};}assert.equal(d.consume(s,40000,{reducedMotion:mode==='reduced'}),null);assert.equal(d.active,null);}
 const d=new LiveCameraDirector(),s=state();d.consume(s,10000);assert.equal(d.consume(s,80000),null);assert.equal(d.nextAt,95000);assert.equal(d.consume(s,95000).kind,'orbit');
 s.paused=true;d.consume(s,96000);assert.equal(d.active,null,'pausing also cancels an orbit already in flight');
});

test('Reload logs cannot replay camera shots and donation gifts still wait for their actual thanks',async()=>{
 const {LiveCameraDirector}=await moduleReady,d=new LiveCameraDirector(),s=state();s.events=[event('old','gift',10000,{gift:'dragon',coins:99})];assert.equal(d.consume(s,10000),null);
 s.events.push(event('paid','gift',10100,{coins:99,gift:'dragon',skillActivated:true}));assert.equal(d.consume(s,10100,{deferGifts:true,minSpeakCoins:5}),null);assert.equal(d.active,null);const shot=d.spokenPresentation('gift',{personId:'donor'},15000,5,'thanks');assert.equal(shot.ends,20850);assert.equal(d.active.event.personId,'donor');
});

test('Camera metadata names the actual healed/revived/executed target and does not advertise inactive skills',()=>{
 const s=E.create(1000);s.config.prepareSeconds=0;let seq=0;const send=(type,values={},now=10000)=>E.dispatch(s,{id:'camera-'+seq++,type,...values},now,()=>.1);
 send('join',{userId:'donor',name:'An',team:'left'});send('gift',{userId:'donor',gift:'dragon'});assert.equal(s.events.at(-1).skillActivated,true);assert.equal(s.events.at(-1).personId,'donor');assert.equal(s.events.at(-1).coins,99);
 send('start');const ally=s.fighters.find(f=>f.team==='left'&&f.id!=='donor');ally.hp=1;send('gift',{userId:'donor',gift:'heal'});assert.deepEqual(s.events.at(-1).targets,[ally.id]);
 ally.hp=0;send('gift',{userId:'donor',gift:'revive'});assert.deepEqual(s.events.at(-1).targets,[ally.id]);assert.equal(s.events.at(-1).skillActivated,true);
 send('gift',{userId:'donor',gift:'execute'});const last=s.events.at(-1);assert.deepEqual(last.targets,['donor']);assert.equal(s.people.find(p=>p.id==='donor').extraStrikes,1);assert.equal(s.fighters.find(f=>f.id==='donor').hp,200);
 send('gift',{userId:'donor',gift:'revive'});assert.equal(s.events.at(-1).skillActivated,false);
 send('settings',{values:{cameraEnabled:false,cameraStrength:99}});assert.equal(s.config.cameraEnabled,false);assert.equal(s.config.cameraStrength,1.25);
});
test('Busy welcomes never queue catch-up closeups, while gifts retain cameras above the threshold',async()=>{
 const {LiveCameraDirector}=await moduleReady,d=new LiveCameraDirector(),s=state();s.people=Array.from({length:31},(_,i)=>({id:'p'+i}));d.consume(s,10000);
 d.pending={kind:'welcome',event:event('queued','join',10000)};s.events.push(event('busy','join',10100));assert.equal(d.consume(s,10100),null);assert.equal(d.pending,null);
 s.people.pop();assert.equal(d.consume(s,10200),null,'no camera replay when population falls to 30');s.events.push(event('new','join',10300));assert.equal(d.consume(s,10300).kind,'welcome');
 s.people.push({id:'p30'});s.events.push(event('paid','gift',10400,{gift:'rose',coins:1}));assert.equal(d.consume(s,10400).kind,'gift');
});

test('Every fresh automatic tiger/dragon skill enters one shared camera frame without interrupting gift speech',async()=>{
 const {LiveCameraDirector}=await moduleReady,d=new LiveCameraDirector(),s=state();d.consume(s,10000);
 const skill=(id,at,actor,target,form)=>event(id,'skill',at,{actor,target,personId:actor,actorForm:form,physical:true});
 s.events.push(skill('claw',10100,'tiger','a','tiger'),skill('fire',10100,'dragon','b','dragon'));const shot=d.consume(s,10100);assert.equal(shot.kind,'skill');assert.equal(shot.skillEvents.length,2);assert.equal(d.consume(s,10101),null);
 const gift=d.spokenPresentation('gift',{personId:'donor'},10200,5,'thanks');assert.equal(gift.skillEvents.length,2);
 s.events.push(skill('next',10300,'tiger2','c','tiger'));const combined=d.consume(s,10300);assert.equal(combined.id,gift.id);assert.equal(combined.kind,'gift');assert.equal(combined.speechId,'thanks');assert.equal(combined.skillEvents.length,3);assert.equal(combined.ends,gift.ends);
});
