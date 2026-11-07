'use strict';
// Accelerated deterministic fixtures, never a claim that a real TikTok session passed.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const {Runtime}=require('../server/runtime.cjs'),{Store}=require('../server/store.cjs'),{Speech}=require('../server/speech.cjs');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuat-rehearsal-')),store=new Store(directory);store.acquire();
let simulatedNow=Date.now(),giftIndex=0,expectedCoins=0;const started=performance.now(),gifts=[],durations=[];
const make=store=>new Runtime({store,now:()=>simulatedNow,speech:new Speech({synth:async()=>Buffer.from('fixture')}),sessionFactory:()=>({state:{status:'idle'},disconnect:async()=>{}})});
const runtime=make(store),skills=['rose','cake','heal','revive','tiger','dragon','execute'];
runtime.configure({voiceEnabled:false,giftRules:skills.map((skill,i)=>({giftId:String(900+i),aliases:[],name:skill,skill,unitCoins:i+1}))});
try{
 for(let i=0;i<40;i++)runtime.ingest('member',{common:{msgId:'join-'+i},user:{id:'user-'+i,nickname:'Tuất thử '+i}},'fixture-room');
 runtime.command({id:'rehearsal-start',type:'start'});
 for(let second=0;second<1800;second++){
  simulatedNow+=1000;const begin=performance.now();runtime.tick();const user={id:'user-'+second%40,nickname:'Tuất thử '+second%40};
  if(second%3===0)runtime.ingest('like',{common:{msgId:'like-'+second},user,likeCount:7},'fixture-room');
  if(second%5===0)runtime.ingest('chat',{common:{msgId:'chat-'+second},user,comment:'gâu'},'fixture-room');
  if(second%71===0)runtime.ingest('share',{common:{msgId:'share-'+second},user},'fixture-room');
  if(second%101===0)runtime.ingest('follow',{common:{msgId:'follow-'+second},user},'fixture-room');
  if(second%17===0){const i=giftIndex++%7,raw={common:{msgId:'gift-'+second},groupId:'group-'+second,user,giftId:900+i,gift:{type:1,name:skills[i],diamondCount:i+1},repeatCount:3,repeatEnd:0};assert.equal(runtime.ingest('gift',raw,'fixture-room').ignored,true);raw.repeatEnd=1;runtime.ingest('gift',raw,'fixture-room');gifts.push(raw);expectedCoins+=(i+1)*3;assert.equal(runtime.ingest('gift',{...raw,common:{msgId:'replay-'+second}},'fixture-room').duplicate,true);}
  const s=runtime.document.game;assert.equal(s.fighters.length,10);assert.ok(s.fighters.every(f=>f.hp>=0&&f.hp<=f.maxHp));assert.ok(s.history.length<=100);assert.ok(s.events.length<=40);durations.push(performance.now()-begin);
 }
 assert.equal(runtime.document.metrics.coins,expectedCoins);const before=runtime.document.sequence,restored=make(new Store(directory));
 for(const raw of gifts)assert.equal(restored.ingest('gift',raw,'fixture-room').duplicate,true);
 assert.equal(restored.document.metrics.coins,expectedCoins);assert.equal(restored.document.game.paused,true);
 durations.sort((a,b)=>a-b);
 const report={kind:'accelerated-fixtures-not-real-live',at:new Date().toISOString(),simulatedSeconds:1800,wallSeconds:(performance.now()-started)/1000,transactions:before,rounds:runtime.document.game.round,history:runtime.document.game.history.length,uniqueGiftCombos:gifts.length,expectedCoins,actualCoins:runtime.document.metrics.coins,duplicateGiftReplays:gifts.length*2,maxStepMilliseconds:durations.at(-1),p95StepMilliseconds:durations[Math.floor(durations.length*.95)],snapshotBytes:fs.statSync(store.file).size,rssMiB:process.memoryUsage().rss/1024/1024,restoredPaused:restored.document.game.paused,pass:true};
 fs.mkdirSync(path.resolve(__dirname,'../test/output'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../test/output/live-rehearsal.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{store.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'tuat-rehearsal-')));fs.rmSync(directory,{recursive:true,force:true});}
