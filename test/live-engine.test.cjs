const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/live-engine.js');let sequence=0;const cmd=(s,type,v={},now=1000,rng=()=>.5)=>E.dispatch(s,{...v,type,id:'test-'+sequence++},now,rng);
// Long-running skill/presence fixtures deliberately keep configurable five-minute rounds.
function populated(){const s=E.create(0);s.config.roundSeconds=300;s.config.breakSeconds=120;s.config.prepareSeconds=0;for(let i=0;i<20;i++)cmd(s,'join',{userId:'p'+i,name:'Bạn '+i,team:i%2?'right':'left'},100);return s;}

test('Default matchmaking reveals a locked 5v5 roster for 15 seconds, then starts a full two-minute battle, three-minute break and next preparation',()=>{
 const s=E.create(0);assert.equal(s.remaining,120);assert.equal(s.config.roundSeconds,120);assert.equal(s.config.breakSeconds,180);assert.equal(s.config.prepareSeconds,15);cmd(s,'start',{},1000);assert.equal(s.phase,'prepare');assert.equal(s.phaseEnd,16000);assert.equal(s.fighters.length,10);const ids=s.fighters.map(f=>f.id),f=s.fighters[0];
 cmd(s,'join',{userId:'late',name:'Người đến sau',team:'left'},2000);cmd(s,'interaction',{userId:'late',kind:'like',count:99},3000);assert.equal(E.points(s,'left'),0);E.tick(s,15999);assert.equal(s.phase,'prepare');cmd(s,'next',{},15999);assert.deepEqual(s.fighters.map(f=>f.id),ids);assert.equal(s.round,1);E.tick(s,16000);assert.equal(s.phase,'battle');assert.equal(s.remaining,120);assert.equal(s.phaseEnd,136000);assert.ok(s.fighters.every(f=>f.skillReadyAt===46000));E.tick(s,136000);assert.equal(s.phase,'break');assert.equal(s.remaining,180);E.tick(s,315999);assert.equal(s.phase,'break');E.tick(s,316000);assert.equal(s.phase,'prepare');assert.equal(s.round,2);
});

test('Preparation survives pause/reload, reserves selected viewers and accepts upgrades without early damage or points',()=>{
 const s=populated();s.config.prepareSeconds=15;cmd(s,'start',{},1000);const f=s.fighters[0],ids=s.fighters.map(f=>f.id);assert.equal(E.waiting(s).length,10);const team=f.team;cmd(s,'move',{userId:f.id,team:team==='left'?'right':'left'},2000);cmd(s,'remove',{userId:f.id},2000);assert.equal(s.people.find(p=>p.id===f.id).team,team);cmd(s,'gift',{userId:f.id,gift:'dragon'},3000);assert.equal(f.form,'dragon');cmd(s,'comment',{userId:f.id,text:'gâu'},4000);assert.equal(E.points(s,team),0);assert.equal(E.total(s,'right'),1000);cmd(s,'pause',{},5000);assert.equal(s.remaining,11);for(const at of [200000,499999])for(const p of s.people)cmd(s,'comment',{userId:p.id,text:'có mặt'},at);const restored=JSON.parse(JSON.stringify(s));E.tick(restored,500000);assert.equal(restored.phase,'prepare');cmd(restored,'pause',{},500000);E.tick(restored,510999);assert.equal(restored.phase,'prepare');E.tick(restored,511000);assert.equal(restored.phase,'battle');assert.equal(restored.phaseEnd,811000);assert.deepEqual(restored.fighters.map(f=>f.id),ids);
});
test('LIVE rank leads selection, coins break missing/tied ranks; overflow stays neutral',()=>{
 const s=populated();s.people.forEach((p,i)=>{p.liveRank=i+1;p.liveRankAt=1000;});s.people[19].coins=9999;s.people[18].pinned=true;
 cmd(s,'start',{},10000);assert.equal(s.fighters.length,10);assert.deepEqual(s.fighters.map(f=>f.id).sort(),Array.from({length:10},(_,i)=>'p'+i).sort());assert.ok(s.fighters.every(f=>!f.bot));assert.ok(E.waiting(s).every(p=>p.team===null));
 const a=populated();a.people[19].coins=99;a.people[18].coins=50;cmd(a,'start',{},10000);assert.ok(a.fighters.some(f=>f.id==='p19'));assert.ok(a.fighters.some(f=>f.id==='p18'));
 const x=populated(),y=populated();cmd(x,'start',{},10000,()=>.1);cmd(y,'start',{},10000,()=>.9);assert.notDeepEqual(x.fighters.map(f=>f.id),y.fighters.map(f=>f.id));
});

test('Custom five-minute battle and two-minute break remain configurable; pause freezes deadline',()=>{
 const s=populated();s.config.roundSeconds=300;s.config.breakSeconds=120;cmd(s,'start',{},1000);assert.equal(s.phaseEnd,301000);cmd(s,'pause',{},61000);assert.equal(s.remaining,240);E.tick(s,500000);assert.equal(s.remaining,240);cmd(s,'pause',{},500000);assert.equal(s.phaseEnd,740000);E.tick(s,740000);assert.equal(s.phase,'break');assert.equal(s.remaining,120);assert.equal(s.phaseEnd,860000);assert.equal(s.history.length,1);E.tick(s,860000);assert.equal(s.round,2);assert.equal(s.phase,'battle');assert.equal(s.remaining,300);assert.ok(s.fighters.every(f=>f.hp===200));
});
test('Different cheer gifts always support Red or Blue regardless of the sender team and obey the point cap',()=>{
 const s=populated();cmd(s,'start');cmd(s,'gift',{userId:'p2',gift:'rose',team:'right',count:10});assert.equal(s.boost.left,3);assert.equal(s.boost.right,0);cmd(s,'gift',{userId:'p2',gift:'cake',team:'left',count:1000});assert.equal(s.boost.right,80);assert.equal(s.supportCoins.left,10);assert.equal(s.supportCoins.right,1000);assert.equal(E.points(s,'left'),0);cmd(s,'next');cmd(s,'next');assert.equal(s.boost.right,0);
});
test('heal, revive, tiger, Chinese dragon and execution change actual fighter state',()=>{
 const s=populated();cmd(s,'start');const left=s.fighters.filter(f=>f.team==='left');left[0].hp=20;
 cmd(s,'gift',{userId:'p0',team:'left',gift:'heal'});assert.equal(left[0].hp,100);
 left[1].hp=0;cmd(s,'gift',{userId:'p0',team:'left',gift:'revive'});assert.equal(left[1].hp,140);
 cmd(s,'gift',{userId:left[0].id,team:'left',gift:'tiger'});assert.equal(left[0].form,'tiger');cmd(s,'gift',{userId:left[0].id,team:'left',gift:'dragon'});assert.equal(left[0].form,'dragon');
 const before=E.total(s,'right');cmd(s,'gift',{userId:left[0].id,team:'left',gift:'execute'});assert.equal(E.total(s,'right'),before);assert.equal(s.people.find(p=>p.id===left[0].id).extraStrikes,1);E.tick(s,5000,()=>0);assert.equal(E.total(s,'right'),before);E.tick(s,31000,()=>0);assert.ok(E.total(s,'right')<before);assert.equal(s.people.find(p=>p.id===left[0].id).extraStrikes,0);
});
test('winner and Tuat Vuong persist through a JSON reload with lifetime stats',()=>{
 const s=populated();cmd(s,'start');const champion=s.fighters.find(f=>f.team==='left');cmd(s,'gift',{userId:champion.id,gift:'dragon'},1000);for(const at of [31000,61000,91000])E.tick(s,at,()=>0);for(const p of s.people)cmd(s,'comment',{userId:p.id,text:'có mặt'},290000);E.tick(s,301000,()=>0);assert.equal(s.phase,'break');assert.equal(s.result.winner,'left');assert.equal(s.result.king.id,champion.id);const reload=JSON.parse(JSON.stringify(s));assert.equal(reload.history[0].king.kills,1);assert.equal(reload.people.find(p=>p.id===champion.id).wins,1);assert.equal(reload.people.find(p=>p.id===champion.id).damage,200);assert.equal(reload.history[0].leftPoints,120);
});

test('Normal barks retain the actor model but use dog audio; automatic skills retain the creature roar',()=>{
 const s=populated();cmd(s,'start');const actor=s.fighters.find(f=>f.team==='left');let now=5000;
 for(const form of ['tiger','dragon']){cmd(s,'gift',{userId:actor.id,gift:form},now);assert.equal(s.events.at(-1).actorForm,form);cmd(s,'comment',{userId:actor.id,text:'gâu'},now+1);assert.equal(s.events.at(-1).actorForm,form);assert.equal(s.events.at(-1).soundForm,'dog');assert.equal(s.events.at(-1).damage,0);E.tick(s,now+30000,()=>0);const skill=s.events.findLast(e=>e.kind==='skill');assert.equal(skill.actorForm,form);assert.equal(skill.soundForm,form);assert.ok(skill.damage>0);now+=40000;}
});
test('Insufficient rooms always fill with bots and one real viewer occupies only one slot',()=>{
 const s=E.create();cmd(s,'settings',{values:{demoFill:false}});assert.equal(s.config.demoFill,true);cmd(s,'join',{userId:'one',name:'Minh',team:'left'});cmd(s,'join',{userId:'one',name:'Minh',team:'right'});assert.equal(s.people.length,1);assert.equal(s.events.filter(e=>e.kind==='join').length,1);assert.equal(cmd(s,'start'),true);assert.equal(s.fighters.filter(f=>!f.bot).length,1);assert.equal(s.fighters.filter(f=>f.bot).length,9);
});

test('duplicate commands, queued gifts and paused comments cannot cause extra damage',()=>{
 const s=populated();cmd(s,'start');const p=s.fighters[0];const ev={id:'one-only',type:'gift',userId:p.id,gift:'rose',team:'left'};assert.equal(E.dispatch(s,ev,2000),true);assert.equal(E.dispatch(s,ev,2001),false);assert.equal(s.boost.left,.3);cmd(s,'pause',{},3000);const before=E.total(s,'right');cmd(s,'comment',{userId:p.id,text:'gâu'},5000);assert.equal(E.total(s,'right'),before);cmd(s,'next',{},6000);cmd(s,'gift',{userId:'p0',gift:'dragon',team:'left'},7000);assert.equal(s.phase,'break');assert.ok(s.people.find(p=>p.id==='p0').priorityCoins>0);
});
test('name prefix is applied once and settings are bounded',()=>{
 assert.equal(E.tuat('Tuất Minh'),'Tuất Minh');assert.equal(E.clean('<script>'),'script');const s=E.create();cmd(s,'settings',{values:{maxHp:999999,roundSeconds:NaN,damagePerCoin:-10,gifts:{rose:-50},title:'<b>Sàn</b>'}});assert.equal(s.config.maxHp,5000);assert.equal(s.config.roundSeconds,120);assert.equal(s.config.damagePerCoin,0);assert.equal(s.config.gifts.rose,1);assert.equal(s.config.title,'bSàn/b');
});
test('model settings change bots, while real viewer breeds and permanent upgrades stay fixed',()=>{
 const s=populated();cmd(s,'settings',{values:{modelsLeft:['dragon','tiger','pug','invalid','corgi'],modelsRight:['tiger','husky','dragon','becgie','corgi'],modelScale:8}});assert.equal(s.config.modelScale,1.2);assert.equal(s.config.modelsLeft[3],'becgie');cmd(s,'start');const left=s.fighters.filter(f=>f.team==='left');assert.ok(s.fighters.every(f=>f.form==='dog'),'Lineup settings cannot unlock creatures');assert.equal(left[2].breed,s.people.find(p=>p.id===left[2].id).breed);cmd(s,'gift',{userId:left[0].id,gift:'dragon'});assert.equal(left[0].form,'dragon');
 cmd(s,'settings',{values:{modelsLeft:['shiba','husky','pug','becgie','corgi']}});assert.equal(left[0].form,'dragon');cmd(s,'pin',{userId:left[0].id,value:true});cmd(s,'next');cmd(s,'next');assert.equal(s.fighters.find(f=>f.id===left[0].id).form,'dragon');
});
test('after a configured five-minute round the side with more bark points wins regardless of remaining HP, including a tie',()=>{
 const s=populated();cmd(s,'start',{},1000);const f=s.fighters.find(f=>f.team==='left');f.hp=10;cmd(s,'comment',{userId:f.id,text:'gâu'},5000);E.tick(s,301000);assert.equal(s.result.winner,'left');assert.ok(s.result.leftHp<s.result.rightHp);assert.equal(s.result.leftPoints,8);assert.equal(s.phase,'break');assert.equal(s.phaseEnd,421000);
 const tie=populated();cmd(tie,'start',{},1000);E.tick(tie,301000);assert.equal(tie.result.winner,'draw');
});

test('Spam hearts and gau immediately add points, including every heart in a batch, while replay IDs stay deduplicated',()=>{
 const s=populated();cmd(s,'start');const f=s.fighters[0],before=E.total(s,'right');cmd(s,'gift',{userId:f.id,gift:'dragon'},2000);const ready=f.skillReadyAt;
 cmd(s,'interaction',{kind:'like',userId:f.id,count:200},5000);assert.equal(E.points(s,f.team),1600);cmd(s,'comment',{userId:f.id,text:'GÂU!'},5000);cmd(s,'interaction',{kind:'like',userId:f.id,count:10},5001);assert.equal(E.points(s,f.team),1688);cmd(s,'comment',{userId:f.id,text:'ga\u0302u, gau!!'},5002);assert.equal(E.points(s,f.team),1696);
 const c={id:'same-like',type:'interaction',kind:'like',userId:f.id,count:1};E.dispatch(s,c,5003);E.dispatch(s,c,5004);assert.equal(E.points(s,f.team),1704);assert.equal(E.total(s,'right'),before);assert.equal(f.skillReadyAt,ready);
});

test('Waiting dogs answer hearts and gau without damage in ready, battle and break; dead or paused dogs cannot attack',()=>{
 const s=populated(),id='p0';cmd(s,'comment',{userId:id,text:'gâu'},2000);assert.equal(s.events.at(-1).spectator,true);assert.equal(s.events.at(-1).damage,0);
 cmd(s,'start',{},4000);const waiting=E.waiting(s)[0],before=E.total(s,'left')+E.total(s,'right');cmd(s,'interaction',{kind:'like',userId:waiting.id,count:50},5000);assert.equal(s.events.at(-1).actor,waiting.id);assert.equal(s.events.at(-1).spectator,true);assert.equal(E.total(s,'left')+E.total(s,'right'),before);
 const f=s.fighters[0];f.hp=0;const barks=()=>s.events.filter(e=>e.kind==='bark').length,n=barks();cmd(s,'interaction',{kind:'like',userId:f.id},7000);cmd(s,'comment',{userId:f.id,text:'gâu'},9000);assert.equal(barks(),n);assert.equal(f.hp,0);
 cmd(s,'pause',{},10000);cmd(s,'interaction',{kind:'like',userId:waiting.id},11000);cmd(s,'comment',{userId:waiting.id,text:'gâu'},13000);assert.equal(barks(),n);
 cmd(s,'next',{},14000);cmd(s,'comment',{userId:f.id,text:'gâu gâu!'},16000);assert.equal(s.events.at(-1).spectator,true);assert.equal(s.events.at(-1).actorForm,'dog');assert.equal(s.events.at(-1).damage,0);
});

test('Every nonempty comment preserves a short display message without granting skills or bypassing bark cooldown',()=>{
 const s=populated();cmd(s,'start');const f=s.fighters[0],p=s.people.find(p=>p.id===f.id),before=E.total(s,'right');
 cmd(s,'comment',{userId:p.id,text:'  Chào\n cả xóm 😄  '},5000);assert.equal(p.chat.text,'Chào cả xóm 😄');assert.equal(p.chat.at,5000);assert.equal(E.total(s,'right'),before);
 cmd(s,'comment',{userId:p.id,text:'Gâu!'},6000);const hp=E.total(s,'right');assert.equal(cmd(s,'comment',{userId:p.id,text:'gâu'},6100),true);assert.equal(p.chat.text,'gâu');assert.equal(E.total(s,'right'),hp);
 const c={id:'chat-once',type:'comment',userId:p.id,text:'dragon'};E.dispatch(s,c,7000);E.dispatch(s,c,8000);assert.equal(p.chat.at,7000);assert.equal(f.form,'dog');
 cmd(s,'comment',{userId:p.id,text:'a'.repeat(500)},9000);assert.equal(p.chat.text.length,120);const saved=p.chat;cmd(s,'comment',{userId:p.id,text:'  '},10000);assert.equal(p.chat,saved);
});

test('Only automatic 30-second skills damage opponents; tiger/dragon need exactly seven/three hits regardless of cheer buffs',()=>{
 for(const maxHp of [50,200,5000])for(const [form,hits] of [['tiger',7],['dragon',3]]){const s=populated();cmd(s,'settings',{values:{maxHp}});cmd(s,'start');const f=s.fighters.find(f=>f.team==='left'),target=s.fighters.find(f=>f.team==='right');cmd(s,'gift',{userId:f.id,gift:form},1000);cmd(s,'gift',{userId:f.id,gift:'rose',count:9999},1500);
 for(let i=0;i<100;i++)cmd(s,'comment',{userId:f.id,text:'gâu'},2000+i,()=>0);assert.equal(target.hp,maxHp);assert.equal(f.attackAt,0);
 for(let i=1;i<=hits;i++){for(const p of s.people)cmd(s,'comment',{userId:p.id,text:'có mặt'},1000+i*30000);E.tick(s,1000+i*30000,()=>0);assert.equal(target.hp===0,i===hits,`${form} ${maxHp} HP hit ${i}/${hits}`);const skill=s.events.findLast(e=>e.kind==='skill');assert.equal(skill.physical,true);assert.equal(skill.target,target.id);assert.ok(s.fighters.filter(enemy=>enemy.team!==f.team&&enemy.id!==target.id).every(enemy=>enemy.hp===maxHp),'only the named victim loses HP');assert.equal(f.skillReadyAt,1000+(i+1)*30000);}
 assert.equal(f.damage,maxHp);assert.equal(f.kills,1);}
});

test('A waiting donor transforms immediately and permanently through selection, breaks and later rounds',()=>{
 const s=populated();cmd(s,'start');const p=E.waiting(s)[0];cmd(s,'gift',{userId:p.id,gift:'dragon'},5000);assert.ok(s.fighters.every(f=>f.form==='dog'));assert.equal(p.permanentForm,'dragon');assert.equal(s.events.at(-1).permanent,true);assert.equal(s.events.at(-1).actor,p.id);assert.equal(E.points(s,p.team),0);cmd(s,'pin',{userId:p.id,value:true});for(let i=0;i<2;i++){cmd(s,'next');assert.equal(p.permanentForm,'dragon');cmd(s,'next');assert.equal(s.fighters.find(f=>f.id===p.id).form,'dragon');}
});

test('Skill cooldown freezes through pause, is not reset by repeat transformation gifts, and does not burst to catch up',()=>{
 const s=populated();cmd(s,'start');const f=s.fighters[0];cmd(s,'gift',{userId:f.id,gift:'dragon'},1000);E.tick(s,31000,()=>0);const hp=E.total(s,'right');assert.equal(f.skillReadyAt,61000);cmd(s,'gift',{userId:f.id,gift:'dragon'},40000);assert.equal(f.skillReadyAt,61000);cmd(s,'pause',{},50000);assert.equal(f.skillRemaining,11000);E.tick(s,140000);assert.equal(E.total(s,'right'),hp);cmd(s,'pause',{},150000);for(const p of s.people)cmd(s,'comment',{userId:p.id,text:'có mặt'},150000);assert.equal(f.skillReadyAt,161000);E.tick(s,160999,()=>0);assert.equal(E.total(s,'right'),hp);E.tick(s,161000,()=>0);assert.ok(E.total(s,'right')<hp);assert.equal(f.skillReadyAt,191000);E.tick(s,250000,()=>0);assert.equal(f.skillReadyAt,280000);
});

test('Equal cheering coins give identical boosts, independent of gift batching, sender team and fractional rates',()=>{
 const s=populated();cmd(s,'settings',{values:{damagePerCoin:.05,damageCap:2}});cmd(s,'start');assert.equal(s.config.gifts.rose,s.config.gifts.cake);
 for(let i=0;i<10;i++)cmd(s,'gift',{userId:'p1',team:'right',gift:'rose',count:1});cmd(s,'gift',{userId:'p0',team:'left',gift:'cake',count:10});assert.deepEqual(s.cheerCoins,{left:10,right:10});assert.deepEqual(s.boost,{left:.5,right:.5});
 cmd(s,'settings',{values:{damagePerCoin:.07}});assert.deepEqual(s.boost,{left:.7,right:.7});cmd(s,'gift',{userId:'p0',gift:'rose',count:100});cmd(s,'gift',{userId:'p1',gift:'cake',count:100});assert.deepEqual(s.boost,{left:2,right:2});cmd(s,'next');cmd(s,'next');assert.deepEqual(s.cheerCoins,{left:0,right:0});assert.deepEqual(s.boost,{left:0,right:0});
});


test('New arrivals never pick a team or change their lifetime breed through chat or admin moves',()=>{
 const s=E.create(0);cmd(s,'join',{userId:'stable',name:'An',team:'right'},10);const p=s.people[0],breed=p.breed;assert.equal(p.team,null);assert.ok(s.events.at(-1).text.includes('hàng chờ'));
 for(const text of ['đỏ','xanh','shiba','husky','pug','corgi','becgie'])cmd(s,'comment',{userId:p.id,text},20);
 cmd(s,'move',{userId:p.id,team:'left'},30);assert.equal(p.team,null);assert.equal(p.breed,breed);
 cmd(s,'start',{},1000);assert.equal(s.fighters.find(f=>f.id===p.id).breed,breed);E.tick(s,16000);cmd(s,'next',{},18000);assert.equal(p.team,null);
 cmd(s,'settings',{values:{modelsLeft:Array(5).fill('pug'),modelsRight:Array(5).fill('pug')}},19000);cmd(s,'next',{},20000);assert.equal(s.fighters.find(f=>f.id===p.id).breed,breed);
 cmd(s,'gift',{userId:p.id,gift:'dragon'},21000);assert.equal(p.breed,breed);assert.equal(s.fighters.find(f=>f.id===p.id).form,'dragon');
});

test('Every population and donor count splits real viewers and donors evenly, with balanced contribution totals',()=>{
 for(let count=0;count<=15;count++)for(let donors=0;donors<=Math.min(10,count);donors++){
  const s=E.create(0);s.config.prepareSeconds=0;for(let i=0;i<count;i++)cmd(s,'join',{userId:'real-'+i,name:'Người '+i},100);
  s.people.forEach((p,i)=>{p.liveRank=i+1;p.liveRankAt=1000;p.coins=i<donors?(donors-i)*10:0;});cmd(s,'start',{},1000);
  const real=t=>s.fighters.filter(f=>f.team===t&&!f.bot),giving=t=>real(t).filter(f=>s.people.find(p=>p.id===f.id).coins>0);
  assert.equal(new Set(s.fighters.map(f=>f.id)).size,10);assert.ok(Math.abs(real('left').length-real('right').length)<=1);assert.ok(Math.abs(giving('left').length-giving('right').length)<=1);
  if(count>=10)assert.equal(s.fighters.filter(f=>f.bot).length,0);
 }
 const s=populated();s.people.forEach((p,i)=>{p.liveRank=i+1;p.liveRankAt=1000;p.coins=i<4?[100,90,20,10][i]:0;});cmd(s,'start',{},1000);
 const sum=t=>s.fighters.filter(f=>f.team===t).reduce((n,f)=>n+s.people.find(p=>p.id===f.id).coins,0);assert.equal(sum('left'),110);assert.equal(sum('right'),110);
});

test('Migration preserves the currently visible breed, forms and totals; standby gifts never silently pick Red',()=>{
 const s=populated();cmd(s,'start',{},1000);const f=s.fighters[0],p=s.people.find(p=>p.id===f.id),outside=E.waiting(s)[0];delete p.breed;delete p.assignedBreed;f.breed='corgi';p.preferredBreed='pug';delete outside.breed;delete outside.assignedBreed;outside.preferredBreed='husky';outside.team='right';p.pendingForm='dragon';p.coins=123;
 E.normalizePeople(s);assert.equal(p.breed,'corgi');assert.equal(p.permanentForm,'dragon');assert.equal(p.coins,123);assert.equal(p.team,f.team);assert.equal(outside.breed,'husky');assert.equal(outside.team,null);
 const coins={...s.supportCoins};cmd(s,'gift',{userId:outside.id,gift:'heal'},2000);assert.deepEqual(s.supportCoins,coins);assert.equal(outside.team,null);cmd(s,'gift',{userId:outside.id,gift:'tiger'},3000);assert.equal(outside.permanentForm,'tiger');assert.equal(outside.breed,'husky');assert.deepEqual(s.supportCoins,coins);assert.ok(!Object.hasOwn(s.supportCoins,'null'));
 const restored=JSON.parse(JSON.stringify(s));E.normalizePeople(restored);assert.equal(restored.people.find(x=>x.id===p.id).breed,'corgi');assert.equal(restored.people.find(x=>x.id===outside.id).permanentForm,'tiger');
});


test('Each bot uses its own 2–3 second timer, pauses correctly and cannot bark after dying',()=>{
 const s=E.create(0);s.config.prepareSeconds=0;cmd(s,'start',{},1000,()=>0);const f=s.fighters[0];E.tick(s,2999,()=>0);assert.equal(f.barkAt,0);assert.equal(E.points(s,'left'),0);E.tick(s,3000,()=>0);assert.equal(s.events.filter(e=>e.kind==='bark').length,10);assert.equal(E.points(s,'left'),40);E.tick(s,4999,()=>0);assert.equal(f.barkAt,3000);E.tick(s,5000,()=>0);assert.equal(f.barkAt,5000);assert.equal(E.points(s,'left'),80);
 cmd(s,'pause',{},6000);E.tick(s,99000);assert.equal(f.barkAt,5000);cmd(s,'pause',{},100000);E.tick(s,100999);assert.equal(f.barkAt,5000);E.tick(s,101000,()=>0);assert.equal(f.barkAt,101000);f.hp=0;const points=E.points(s,'left');E.tick(s,104000,()=>0);assert.equal(f.barkAt,101000);assert.equal(E.points(s,'left')-points,32);assert.equal(E.total(s,'right'),1000);
});

test('Bot delays differ per dog and are drawn again after every automatic bark',()=>{
 let n=0;const rng=()=>n++%11/10,s=E.create(0);s.config.prepareSeconds=0;cmd(s,'start',{},1000,rng);assert.ok(new Set(s.fighters.map(f=>f.botBarkReadyAt)).size>=5);assert.ok(s.fighters.every(f=>f.botBarkReadyAt>=3000&&f.botBarkReadyAt<=4000));const intervals=new Set();for(let at=3000;at<=20000;at+=100){E.tick(s,at,rng);for(const f of s.fighters)if(f.barkAt===at){const delay=f.botBarkReadyAt-at;assert.ok(delay>=2000&&delay<=3000);intervals.add(delay);}}assert.ok(intervals.size>=5);
});

test('Bot breeds are drawn independently and do not mirror opposing slots; real viewers keep their assigned dogs',()=>{
 for(const seed of [0,.3,.99]){const s=E.create(0);cmd(s,'start',{},1000,()=>seed);for(let i=0;i<5;i++)assert.notEqual(s.fighters[i].breed,s.fighters[i+5].breed);}
 const s=populated(),breeds=new Map(s.people.map(p=>[p.id,p.breed]));cmd(s,'start');assert.ok(s.fighters.every(f=>f.breed===breeds.get(f.id)));
});

test('Preparation keeps the full 15s until audible onset, then starts once; failed audio has a bounded fallback',()=>{
 const s=E.create(0);cmd(s,'start',{},1000);s.preparationVoice={round:1,deadline:13000};E.tick(s,6000);assert.equal(s.remaining,15);assert.equal(E.releasePreparation(s,6000),true);assert.equal(s.phaseEnd,21000);assert.equal(E.releasePreparation(s,7000),false);E.tick(s,20999);assert.equal(s.phase,'prepare');E.tick(s,21000);assert.equal(s.phase,'battle');
 const fallback=E.create(0);cmd(fallback,'start',{},1000);fallback.preparationVoice={round:1,deadline:13000};E.tick(fallback,13000);assert.equal(fallback.remaining,15);assert.equal(fallback.phaseEnd,28000);assert.equal(fallback.preparationVoice,undefined);
});


test('Real-player slots avoid matching breeds without changing teams, donor balance or any lifetime model',()=>{
 const s=E.create(0);for(let i=0;i<10;i++)cmd(s,'join',{userId:'m-'+i,name:'An'},100);const breeds=['shiba','husky','pug','becgie','corgi'];s.people.forEach((p,i)=>p.breed=p.assignedBreed=breeds[Math.floor(i/2)]);const original=new Map(s.people.map(p=>[p.id,p.breed]));cmd(s,'start',{},1000,()=>.5);
 for(let i=0;i<5;i++)assert.notEqual(s.fighters[i].breed,s.fighters[i+5].breed);assert.ok(s.fighters.every(f=>f.breed===original.get(f.id)));assert.equal(s.fighters.filter(f=>f.bot).length,0);
 const same=E.create(0);for(let i=0;i<10;i++)cmd(same,'join',{userId:'same-'+i,name:'An'},100);same.people.forEach(p=>p.breed=p.assignedBreed='pug');cmd(same,'start');assert.ok(same.fighters.every(f=>f.breed==='pug'),'keep every person’s dog even when all have the same breed');
});


test('Every human still on the patio is eligible even while silent and LIVE counts or room IDs are stale',()=>{
 const s=populated();s.people.forEach(p=>p.liveRoom='old-room');s.people.slice(0,6).forEach(p=>p.liveRoom='current');s.liveAudience={roomId:'current',viewers:3};cmd(s,'start');assert.equal(s.fighters.filter(f=>!f.bot).length,10);assert.equal(s.fighters.filter(f=>f.bot).length,0);
 cmd(s,'next');s.liveAudience.viewers=0;cmd(s,'next');assert.equal(s.fighters.filter(f=>!f.bot).length,10);
 const quiet=E.create(0);quiet.config.prepareSeconds=0;for(let i=0;i<4;i++)cmd(quiet,'join',{userId:'q'+i,name:'Im lặng'},1000);quiet.liveAudience={roomId:'changed',viewers:0};cmd(quiet,'start',{},180999);assert.equal(quiet.fighters.filter(f=>!f.bot).length,4);assert.equal(quiet.fighters.filter(f=>f.bot).length,6);cmd(quiet,'next',{},181000);cmd(quiet,'next',{},181001);assert.equal(quiet.fighters.filter(f=>f.bot).length,10);
});


test('Selected humans keep their name, model and HP through inactivity and pause until the round ends',()=>{
 const s=populated();cmd(s,'start',{},1000);const ids=s.fighters.map(f=>f.id),f=s.fighters[0],p=s.people.find(p=>p.id===f.id);p.wins=7;cmd(s,'gift',{userId:p.id,gift:'dragon'},2000);const breed=p.breed;f.hp=71;cmd(s,'leave',{userId:p.id},3000);cmd(s,'pause',{},7000);E.tick(s,182000);assert.ok(!p.hiddenAt);assert.deepEqual(s.fighters.map(f=>f.id),ids);assert.equal(f.hp,71);assert.equal(f.form,'dragon');assert.ok(E.holdsRoundSeat(s,p));assert.equal(E.waiting(s).filter(p=>!p.bot).length,0);cmd(s,'pause',{},304000);cmd(s,'next',{},305000);assert.equal(s.phase,'break');assert.ok(p.hiddenAt);assert.equal(s.result.roster.length,10);assert.ok(s.result.roster.every(f=>!f.bot));assert.equal(s.result.roster.find(f=>f.id===p.id).name,p.name);cmd(s,'join',{userId:p.id,name:p.name},306000);assert.equal(p.hiddenAt,undefined);assert.equal(p.breed,breed);assert.equal(p.permanentForm,'dragon');
});


test('Three minutes without interaction hides a viewer, and any actual interaction restarts the full timer',()=>{
 const s=E.create(0);cmd(s,'join',{userId:'quiet',name:'An'},100);E.tick(s,180099);assert.equal(E.waiting(s).length,1);E.tick(s,180100);assert.equal(E.waiting(s).length,0);cmd(s,'comment',{userId:'quiet',text:'xin chào'},180200);assert.equal(E.waiting(s).length,1);assert.equal(s.people[0].leftAt,undefined);E.tick(s,360199);assert.equal(E.waiting(s).length,1);E.tick(s,360200);assert.equal(E.waiting(s).length,0);
});

test('Cumulative win honors exclude bots/zero wins, retain departed champions and share ranks for equal wins',()=>{
 const s=E.create(0);for(const id of ['a','b','c','zero','bot-fake'])cmd(s,'join',{userId:id,name:id});for(const [i,p]of s.people.entries()){p.wins=[5,5,3,0,99][i];p.rounds=[10,20,4,0,100][i];}s.people[0].hiddenAt=100;const before=JSON.stringify(s);const top=E.winLeaders(s,5);assert.deepEqual(top.map(p=>[p.id,p.rank,p.wins]),[['a',1,5],['b',1,5],['c',3,3]]);assert.equal(JSON.stringify(s),before);
});


test('A paid gift queued before departure keeps its upgrade but cannot fake a later reentry',()=>{
 const s=E.create(0);cmd(s,'join',{userId:'paid',name:'An'},1000);cmd(s,'leave',{userId:'paid'},2000);E.tick(s,302000);cmd(s,'gift',{userId:'paid',gift:'dragon',receivedAt:1500},303000);assert.ok(s.people[0].hiddenAt);assert.equal(s.people[0].permanentForm,'dragon');cmd(s,'gift',{userId:'paid',gift:'heal',receivedAt:304000},304000);assert.equal(s.people[0].hiddenAt,undefined);
});

test('Ten resident bots survive honors, breaks, ready and new rounds without increasing the 5v5 combat roster',()=>{
 for(const count of [0,3,10,30]){
  const s=E.create(0);s.config.roundSeconds=300;s.config.breakSeconds=120;s.config.prepareSeconds=15;s.config.autoNext=false;
  for(let i=0;i<count;i++)cmd(s,'join',{userId:'resident-test-'+i,name:'Bạn '+i},1000);
  const check=()=>{const view=E.sceneRoster(s),all=[...view.fighters,...view.waiting],active=['prepare','battle'].includes(s.phase);assert.equal(view.fighters.length,active?10:0);assert.equal(all.filter(f=>f.bot).length,10);assert.equal(new Set(all.map(f=>f.id)).size,all.length);assert.equal(all.filter(f=>!f.bot).length,count);if(!active){assert.equal(view.waiting.length,count+10);assert.ok(view.waiting.every(p=>p.team===null));}return view;};
  check();cmd(s,'start',{},2000);check();E.tick(s,17000);check();s.fighters[0].hp=0;for(const p of s.people)cmd(s,'comment',{userId:p.id,text:'có mặt'},290000);E.tick(s,317000);assert.equal(s.phase,'break');const result=JSON.stringify(s.result),points=JSON.stringify(s.points),events=s.events.length;check();E.tick(s,327001);check();assert.equal(JSON.stringify(s.result),result);assert.equal(JSON.stringify(s.points),points);assert.equal(s.events.length,events,'waiting bots cannot keep attacking or scoring during the break');E.tick(s,437000);assert.equal(s.phase,'ready');assert.equal(check().waiting.filter(f=>f.bot&&f.hp===s.config.maxHp).length,10);
  cmd(s,'start',{},438000);check();assert.equal(s.fighters.length,10);assert.equal(s.fighters.filter(f=>!f.bot).length,Math.min(10,count));
 }
});

test('Honors retain active viewers, exactly three quiet minutes hides only people, and interaction restores them',()=>{
 const s=E.create(0);s.config.prepareSeconds=0;s.config.autoNext=false;cmd(s,'join',{userId:'keeper',name:'An'},1000);cmd(s,'gift',{userId:'keeper',gift:'dragon'},2000);cmd(s,'start',{},3000);cmd(s,'comment',{userId:'keeper',text:'có mặt'},290000);E.tick(s,303000);E.tick(s,313001);
 const shown=()=>E.sceneRoster(s),bots=()=>[...shown().fighters,...shown().waiting].filter(f=>f.bot);assert.ok(shown().waiting.some(p=>p.id==='keeper'));assert.equal(bots().length,10);E.tick(s,469999);assert.ok(shown().waiting.some(p=>p.id==='keeper'));E.tick(s,470000);assert.ok(!shown().waiting.some(p=>p.id==='keeper'));assert.equal(bots().length,10);cmd(s,'comment',{userId:'keeper',text:'xin chào'},591000);assert.equal(shown().waiting.find(p=>p.id==='keeper').permanentForm,'dragon');assert.equal(bots().length,10);
});

test('Changing the presence policy preserves real activity and does not grant a fresh three-minute window',()=>{
 const s=E.create(0);cmd(s,'join',{userId:'recent',name:'An'},1000);cmd(s,'join',{userId:'old',name:'Bình'},1000);s.people[0].lastInteractionAt=1150000;s.people.forEach(p=>p.hiddenAt=1200000);s.presenceIdleMs=1200000;E.normalizePeople(s,1300000);assert.equal(s.people[0].hiddenAt,undefined);assert.ok(s.people[1].hiddenAt);assert.equal(s.people[0].lastInteractionAt,1150000);E.tick(s,1329999);assert.ok(!s.people[0].hiddenAt);E.tick(s,1330000);assert.ok(s.people[0].hiddenAt);
});

test('A same-millisecond burst from 100 viewers retains every point and one cumulative cue per actor beyond the 40-event log',()=>{
 const s=E.create(0),cursor={};s.config.prepareSeconds=0;for(let i=0;i<100;i++)cmd(s,'join',{userId:'burst-'+i,name:'Test '+i},100);cmd(s,'start',{},1000);assert.deepEqual(E.barkCues(s,cursor,1000),[]);const expected={left:0,right:0};
 for(let n=1;n<=5;n++)for(const p of s.people){const f=s.fighters.find(f=>f.id===p.id);if(f)expected[f.team]+=8*n;cmd(s,'interaction',{userId:p.id,kind:'like',count:n},2000);}
 const cues=E.barkCues(s,cursor,2000);assert.equal(s.events.length,40);assert.deepEqual(s.points,expected);assert.equal(cues.length,100);assert.equal(cues.reduce((n,c)=>n+c.count,0),1500);assert.equal(cues.reduce((n,c)=>n+c.points,0),expected.left+expected.right);assert.ok(cues.slice(0,10).every(c=>!c.spectator));assert.deepEqual(E.barkCues(s,cursor,2001),[]);
 const restored={};assert.deepEqual(E.barkCues(s,restored,2001),[],'reloading never replays cumulative history');cmd(s,'next',{},2100);const p=s.people.find(p=>p.id===s.fighters[0].id);cmd(s,'interaction',{userId:p.id,kind:'like',count:7},2200);const outside=E.barkCues(s,cursor,2200);assert.equal(outside.length,1);assert.equal(outside[0].count,7);assert.equal(outside[0].points,0);assert.equal(outside[0].spectator,true);
});

test('Heavy free-heart traffic cannot erase the latest paid gift or real skill from the next presentation snapshot',()=>{
 const s=populated();cmd(s,'start',{},1000);const f=s.fighters[0];cmd(s,'gift',{userId:f.id,gift:'dragon'},2000);E.tick(s,32000,()=>0);const gift=s.events.find(e=>e.kind==='gift'),skill=s.events.find(e=>e.kind==='skill');assert.ok(gift&&skill);for(let i=0;i<100;i++)cmd(s,'interaction',{userId:f.id,kind:'like',count:3},32001);assert.equal(s.events.length,40);assert.ok(s.events.some(e=>e.id===gift.id));assert.ok(s.events.some(e=>e.id===skill.id));
});


test('A viewer has one locked dog model across arrivals, cached-detail transitions, dormancy, rematches and allowed upgrades',()=>{
 const s=E.create(0);s.config.prepareSeconds=0;cmd(s,'join',{userId:'fixed-model',name:'An'},1000);const p=s.people[0],breed=p.breed;assert.equal(p.assignedBreed,breed);for(let i=0;i<170;i++)cmd(s,'join',{userId:'arrival-'+i,name:'Khách '+i},2000+i);p.breed=breed==='pug'?'husky':'pug';assert.equal(E.fixedBreed(p),breed);assert.equal(E.modelFor(p),breed);E.normalizePeople(s,3000);assert.equal(p.breed,breed);p.pinned=true;p.liveRank=1;p.liveRankAt=3000;cmd(s,'start',{},3000);assert.equal(s.fighters.find(f=>f.id===p.id).breed,breed);cmd(s,'next',{},4000);E.tick(s,301000);assert.ok(p.hiddenAt);cmd(s,'comment',{userId:p.id,text:'xin chào'},302000);assert.equal(p.breed,breed);assert.equal(E.modelFor(p),breed);cmd(s,'gift',{userId:p.id,gift:'dragon'},303000);assert.equal(E.modelFor(p),'dragon');assert.equal(p.assignedBreed,breed);const copy=JSON.parse(JSON.stringify(s));E.normalizePeople(copy,304000);assert.equal(E.modelFor(copy.people.find(x=>x.id===p.id)),'dragon');assert.equal(copy.people.find(x=>x.id===p.id).assignedBreed,breed);
});

test('Actual contributions and free interactions rank real people before any bot fill',()=>{
 const s=E.create(0);s.config.prepareSeconds=0;for(let i=0;i<14;i++)cmd(s,'join',{userId:'human-'+i,name:'Bạn '+i},1000);cmd(s,'gift',{userId:'human-13',gift:'rose',count:20},1100);for(let i=3;i<13;i++)cmd(s,'interaction',{userId:'human-'+i,kind:'like',count:100+i},1200);cmd(s,'comment',{userId:'human-12',text:'xin chào'},1201);assert.equal(s.people.find(p=>p.id==='human-12').commentCount,1);const picks=E.matchmake(s,1300,()=>.5),selected=[...picks.left,...picks.right];assert.equal(selected.length,10);assert.ok(selected.some(p=>p.id==='human-13'));assert.ok(!selected.some(p=>['human-0','human-1','human-2','human-3'].includes(p.id)));cmd(s,'start',{},1300);assert.equal(s.fighters.filter(f=>f.bot).length,0);assert.equal(s.fighters.filter(f=>f.team==='left'&&!f.bot).length,5);assert.equal(s.fighters.filter(f=>f.team==='right'&&!f.bot).length,5);
});

test('Reload repairs legacy Giu san substitutions without healing the slot, duplicating honors or changing team points',()=>{
 const s=populated();cmd(s,'start',{},1000);const old={...s.fighters[0],departed:true,roundPoints:23},p=s.people.find(p=>p.id===old.id);s.retiredFighters=[old];p.hiddenAt=181000;s.fighters[0]={...old,id:'bot-'+old.team+'-'+old.slot+'-'+s.round,name:'Giữ sân',bot:true,form:'dog',hp:61,roundPoints:0};s.points[old.team]=99;E.normalizePeople(s,200000);const restored=s.fighters[0];assert.equal(restored.id,old.id);assert.equal(restored.name,p.name);assert.equal(restored.hp,61);assert.equal(restored.roundPoints,23);assert.equal(s.points[old.team],99);assert.equal(p.hiddenAt,undefined);assert.equal(s.retiredFighters.length,0);E.tick(s,201000);assert.equal(s.fighters[0].id,old.id);cmd(s,'next',{},202000);assert.equal(s.result.roster.filter(f=>f.id===old.id).length,1);assert.ok(p.hiddenAt);
});

test('Silent selected people are not welcomed again solely for crossing 3 minutes, and no-people rounds still have 10 bots',()=>{
 const s=populated();cmd(s,'start',{},1000);const p=s.people.find(p=>p.id===s.fighters[0].id);E.tick(s,181000);assert.equal(E.shouldWelcome(s,p,181000),false);cmd(s,'comment',{userId:p.id,text:'xin chào'},181001);cmd(s,'next',{},182000);assert.equal(p.hiddenAt,undefined);const empty=E.create(0);empty.config.prepareSeconds=0;cmd(empty,'start',{},1000);assert.equal(empty.fighters.filter(f=>f.bot).length,10);assert.ok(empty.fighters.every(f=>f.name!=='Giữ sân'));
});

test('Filtering archived viewers before ranking preserves the exact waiting order in every phase',()=>{
 const s=E.create(1000);s.updatedAt=2000;for(let i=0;i<1000;i++)s.people.push({id:'order-'+i,name:'Bạn '+i,joinedAt:1000,waitingSince:1000+i,coins:i%19,like:i%37,liveRank:i%7===0?i%11+1:undefined,liveRankAt:1900,hiddenAt:i%5?1900:undefined});
 s.fighters=s.people.slice(0,10).map((p,i)=>({id:p.id,bot:false,team:i%2?'left':'right'}));
 for(const phase of ['ready','prepare','battle','break']){s.phase=phase;const active=new Set(['prepare','battle'].includes(phase)?s.fighters.map(f=>f.id):[]),before=structuredClone(s),expected=E.ranked(s,2000).filter(p=>!p.hiddenAt&&!active.has(p.id));assert.deepEqual(E.waiting(s),expected);assert.deepEqual(s,before);}
});
