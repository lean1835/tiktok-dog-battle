/* Shared source embedded into BOTH delivered HTML files. No runtime dependency. */
(function(root){
 'use strict';
 const GIFT_DEFS=[
  {id:'rose',icon:'🌹',name:'Cổ vũ Đỏ',supportTeam:'left',coins:1,description:'Hoa → tăng điểm sủa Xóm Đỏ'},
  {id:'cake',icon:'🍦',name:'Cổ vũ Xanh',supportTeam:'right',coins:1,description:'Kem → tăng điểm sủa Xóm Xanh'},
  {id:'heal',icon:'💚',name:'Hồi HP',coins:5,description:'Hồi 80 HP cho tuất yếu nhất'},
  {id:'revive',icon:'🪽',name:'Hồi sinh',coins:30,description:'Gọi lại 1 tuất đã gục'},
  {id:'tiger',icon:'🐯',name:'Hóa Hổ',coins:49,description:'Cộng điểm + sát thương · 7 đòn hạ tuất'},
  {id:'dragon',icon:'🐉',name:'Hóa Rồng',coins:99,description:'Cộng điểm + sát thương · 3 đòn hạ tuất'},
  {id:'execute',icon:'⚡',name:'Cường hóa',displayName:'Tắt LIVE',coins:199,description:''},
 ];
 const MODEL_IDS=['shiba','husky','pug','becgie','corgi','tiger','dragon'];
 const defaults={title:'ĐẤU TRƯỜNG TUẤT',leftName:'XÓM ĐỎ',rightName:'XÓM XANH',roundSeconds:120,prepareSeconds:15,breakSeconds:180,maxHp:200,baseDamage:8,attackInterval:2500,damagePerCoin:.3,damageCap:80,healHp:80,revivePercent:70,volume:65,musicEnabled:true,musicVolume:30,modelScale:1,cameraEnabled:true,cameraStrength:1,modelsLeft:['shiba','husky','pug','becgie','corgi'],modelsRight:['shiba','husky','pug','becgie','corgi'],autoNext:true,demoFill:true,earlyWin:false,gifts:Object.fromEntries(GIFT_DEFS.map(g=>[g.id,g.coins]))};
 const finite=(v,d,min,max)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):d;
 const clean=s=>String(s??'').replace(/[<>\u0000-\u001f]/g,'').replace(/^tuất\s*/i,'').trim().slice(0,32)||'Ẩn danh';
 const tuat=s=>'Tuất '+clean(s);
 const other=t=>t==='left'?'right':'left';
 const PRESENCE_IDLE_MS=3*60*1000;
 const DOG_IDS=MODEL_IDS.slice(0,5);
 const botBarkDelay=(rng=Math.random)=>2000+Math.round(Math.max(0,Math.min(1,rng()))*1000);
 function breedFor(id){return DOG_IDS[[...String(id)].reduce((a,c)=>a+c.charCodeAt(0),0)%DOG_IDS.length];}
 function fixedBreed(p,f){return [p?.assignedBreed,p?.breed,f?.breed,p?.preferredBreed].find(id=>DOG_IDS.includes(id))||breedFor(p?.id||f?.id||'guest');}
 function modelFor(p){return [p?.permanentForm,p?.form].find(id=>['tiger','dragon'].includes(id))||fixedBreed(p);}
 function normalizePeople(s,now=Date.now()){
  if(!Number.isFinite(s.presencePolicyStartedAt))s.presencePolicyStartedAt=now;
  if(s.presenceIdleMs!==PRESENCE_IDLE_MS){
   // Apply the current three-minute window without inventing an interaction.
   for(const p of s.people)if(p.hiddenAt&&now-activityAt(s,p)<PRESENCE_IDLE_MS)delete p.hiddenAt;
   s.presenceIdleMs=PRESENCE_IDLE_MS;
  }
  const active=['prepare','battle'].includes(s.phase);
  // Recover names replaced by the former three-minute policy, without healing
  // the slot or changing the score of the round already in progress.
  if(active&&s.retiredFighters?.length){const restored=new Set();for(const old of s.retiredFighters){const p=s.people.find(p=>p.id===old.id),index=s.fighters.findIndex(f=>f.bot&&f.name==='Giữ sân'&&f.team===old.team&&f.slot===old.slot);if(!old.departed||old.bot||!p||index<0)continue;const current=s.fighters[index];s.fighters[index]={...old,hp:current.hp,maxHp:current.maxHp,hitAt:current.hitAt};delete s.fighters[index].departed;delete p.hiddenAt;restored.add(old.id);}s.retiredFighters=s.retiredFighters.filter(f=>!restored.has(f.id));}
  for(const p of s.people){const f=s.fighters.find(f=>!f.bot&&f.id===p.id);
   p.assignedBreed=fixedBreed(p,f);p.breed=p.assignedBreed;
   p.team=active&&f?f.team:null;
   if(!p.permanentForm&&['tiger','dragon'].includes(p.pendingForm||f?.form))p.permanentForm=p.pendingForm||f.form;
   delete p.pendingForm;
  }return s;
 }
 function contribution(p){return Math.max(Number(p.coins)||0,Number(p.liveContribution)||0);}
 function liveRank(p,now){return p.liveRank>0&&now-(p.liveRankAt||0)<=120000?p.liveRank:Infinity;}
 function interactionCount(p){return ['like','follow','share','commentCount'].reduce((n,k)=>n+Math.max(0,Number(p[k])||0),0);}
 function rankCompare(a,b,now){return (liveRank(a,now)-liveRank(b,now)||0)||contribution(b)-contribution(a)||Number(!!b.pinned)-Number(!!a.pinned)||interactionCount(b)-interactionCount(a)||activityAt(null,b)-activityAt(null,a)||(a.waitingSince-b.waitingSince);}
 function ranked(s,now=Date.now(),rng){const a=s.people.slice();if(rng)for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.sort((a,b)=>rankCompare(a,b,now));}
 function matchmake(s,now,rng=Math.random){
  const picks=ranked(s,now,rng).filter(p=>!p.bot&&!String(p.id).startsWith('bot-')&&!p.hiddenAt&&now-activityAt(s,p)<PRESENCE_IDLE_MS).slice(0,10),size=Math.ceil(picks.length/2),totalCoins=picks.reduce((n,p)=>n+contribution(p),0),donors=picks.filter(p=>contribution(p)>0).length,totalRank=picks.reduce((n,p,i)=>n+i+1,0);let best=null;
  // At most 252 partitions: equal real-player counts first, then equal donor counts,
  // then the closest contribution totals and LIVE-rank strength.
  for(let mask=0;mask<(1<<picks.length);mask++){
   const left=picks.filter((p,i)=>mask&(1<<i));if(left.length!==size)continue;
   const coins=left.reduce((n,p)=>n+contribution(p),0),donorDiff=Math.abs(2*left.filter(p=>contribution(p)>0).length-donors),rankSum=picks.reduce((n,p,i)=>n+((mask&(1<<i))?i+1:0),0),balance=(totalCoins?Math.abs(2*coins-totalCoins)/totalCoins:0)+Math.abs(2*rankSum-totalRank)/Math.max(1,totalRank);
   if(!best||donorDiff<best.donorDiff||donorDiff===best.donorDiff&&balance<best.balance)best={mask,donorDiff,balance};
  }
  const left=picks.filter((p,i)=>best.mask&(1<<i)),right=picks.filter((p,i)=>!(best.mask&(1<<i)));let arranged=right,cost=Infinity;
  // Rearrange slots, never a person's breed, to avoid mirrored real-viewer models where possible.
  const visual=p=>modelFor(p);function arrange(order,rest){if(!rest.length){const n=order.reduce((sum,p,i)=>sum+Number(visual(p)===visual(left[i])),0);if(n<cost){cost=n;arranged=order;}return;}for(let i=0;i<rest.length;i++)arrange([...order,rest[i]],rest.filter((p,j)=>j!==i));}arrange([],right);
  return {left,right:arranged};
 }
 function create(now=Date.now()) {return {version:3,config:JSON.parse(JSON.stringify(defaults)),people:[],fighters:[],presencePolicyStartedAt:now,phase:'ready',paused:false,remaining:defaults.roundSeconds,phaseEnd:0,lastAttack:0,round:0,history:[],events:[],processed:[],points:{left:0,right:0},boost:{left:0,right:0},cheerCoins:{left:0,right:0},supportCoins:{left:0,right:0},result:null,createdAt:now,revision:0};}
 // Ten resident bots always have a visible place. During matches they either fill
 // their court slot or watch outside; presentation never adds extra combatants.
 function sceneRoster(s){
  const active=['prepare','battle'].includes(s.phase),fighters=active?s.fighters:[],bots=[];
  for(const team of ['left','right'])for(let slot=0;slot<5;slot++){
   const current=s.fighters?.find(f=>f.bot&&f.team===team&&f.slot===slot),models=s.config[team==='left'?'modelsLeft':'modelsRight']||defaults.modelsLeft;
   bots.push({id:`bot-${team}-${slot}`,name:['Vàng','Mực','Bông','Lu','Ki'][slot],team,slot,bot:true,resident:true,breed:current?.breed||models[slot]||'shiba',form:'dog',hp:s.config.maxHp||200,maxHp:s.config.maxHp||200,barkAt:0,attackAt:0});
  }
  const outside=bots.filter(b=>!fighters.some(f=>f.bot&&f.team===b.team&&f.slot===b.slot)).map(b=>({...b,team:null,joinedAt:Number.MAX_SAFE_INTEGER}));
  return {fighters,waiting:[...(Array.isArray(s.people)?waiting(s):[]),...outside]};
 }
 function log(s,text,kind='info',now=Date.now(),extra={}){s.events.push({id:`${now}-${s.revision++}`,text:String(text).slice(0,180),kind,at:now,...extra});if(s.events.length>40){const important=s.events.filter(e=>['gift','skill','prepare','round','win'].includes(e.kind)).slice(-8),ids=new Set(important.map(e=>e.id)),recent=s.events.filter(e=>!ids.has(e.id)).slice(-(40-ids.size));for(const e of recent)ids.add(e.id);s.events=s.events.filter(e=>ids.has(e.id));}}
 function person(s,id,name,t,now) {
  let p=s.people.find(p=>p.id===id);if(p)return p;
  p={id:String(id).slice(0,80),name:clean(name),team:null,breed:breedFor(id),assignedBreed:breedFor(id),lastInteractionAt:now,joinedAt:now,waitingSince:now,pinned:false,coins:0,priorityCoins:0,wins:0,kills:0,damage:0,healed:0,rounds:0,lastPlayed:0};s.people.push(p);return p;
 }
 function activityAt(s,p){return Number.isFinite(p.lastInteractionAt)?p.lastInteractionAt:Math.max(p.joinedAt||0,s?.presencePolicyStartedAt??p.joinedAt??s?.createdAt??0);}
 function holdsRoundSeat(s,p){return !!p&&['prepare','battle'].includes(s.phase)&&s.fighters.some(f=>!f.bot&&f.id===p.id);}
 function shouldWelcome(s,p,now){return !p||!!p.hiddenAt||p.leftAt!==undefined||!holdsRoundSeat(s,p)&&now-activityAt(s,p)>=PRESENCE_IDLE_MS;}
 function arrive(p,at){if(p&&(at<(p.lastInteractionAt??-Infinity)||p.leftAt!==undefined&&at<p.leftAt||p.hiddenAt&&at<p.hiddenAt))return p;if(p){p.lastInteractionAt=at;delete p.leftAt;delete p.hiddenAt;}return p;}
 function join(s,c,now){if(!c.userId)return false;const existing=s.people.find(p=>p.id===c.userId),returning=shouldWelcome(s,existing,now),p=person(s,c.userId,c.name,c.team,now);if(!p)return false;arrive(p,now);if(!existing||returning)log(s,`Chào ${tuat(p.name)}! Vào hàng chờ, đợi ghép đội nhé.`, 'join',now,{personId:p.id});return true;}
 function select(s,t,now,rng=Math.random){return matchmake(s,now,rng)[t]||[];}
 function start(s,now,rng=Math.random){
  normalizePeople(s,now);expireDepartures(s,now);const teams=matchmake(s,now,rng);
  for(const p of s.people)p.team=null;for(const t of ['left','right'])for(const p of teams[t])p.team=t;
  s.round++;s.fighters=[];s.retiredFighters=[];s.result=null;s.points={left:0,right:0};s.boost={left:0,right:0};s.cheerCoins={left:0,right:0};s.supportCoins={left:0,right:0};
  for(const t of ['left','right']){
   const picks=teams[t];
   for(let i=0;i<5;i++){
    const p=picks[i];if(p){p.lastPlayed=s.round;p.rounds++;p.priorityCoins=0;}
    let model=p?fixedBreed(p):null;if(!p){const pool=(s.config[t==='left'?'modelsLeft':'modelsRight']||defaults.modelsLeft).filter(id=>DOG_IDS.includes(id));model=pool[Math.floor(rng()*pool.length)]||'shiba';const opposite=s.fighters.find(f=>f.team!==t&&f.slot===i);if(opposite?.breed===model)model=DOG_IDS[(DOG_IDS.indexOf(model)+1+Math.floor(rng()*4))%5];}
    s.fighters.push({id:p?.id||`bot-${t}-${i}`,name:p?.name||['Vàng','Mực','Bông','Lu','Ki'][i],team:t,slot:i,bot:!p,breed:MODEL_IDS.slice(0,5).includes(model)?model:'shiba',form:['tiger','dragon'].includes(p?.permanentForm||p?.pendingForm)?(p.permanentForm||p.pendingForm):'dog',hp:s.config.maxHp,maxHp:s.config.maxHp,damage:0,kills:0,healed:0,score:0,roundPoints:0,attackAt:0,barkAt:0,skillReadyAt:now+30000,hitAt:0});if(p?.pendingForm){p.permanentForm=p.pendingForm;delete p.pendingForm;}
   }
  }
  s.paused=false;const seconds=s.config.prepareSeconds??15;if(seconds<=0){beginBattle(s,now,rng);return true;}s.phase='prepare';s.remaining=seconds;s.phaseEnd=now+seconds*1000;s.lastAttack=now;
  log(s,`Đã ghép đội trận ${s.round}. ${seconds} giây chuẩn bị!`,'prepare',now);return true;
 }
 function beginBattle(s,now,rng=Math.random){
  s.phase='battle';s.remaining=s.config.roundSeconds;s.phaseEnd=now+s.remaining*1000;s.lastAttack=now;for(const f of s.fighters){f.skillReadyAt=now+30000;delete f.skillRemaining;f.barkAt=0;f.attackAt=0;if(f.bot)f.botBarkReadyAt=now+botBarkDelay(rng);}
  log(s,`Trận ${String(s.round).padStart(2,'0')} bắt đầu! Mỗi xóm 5 tuất.`,'round',now);
 }
 function alive(s,t){return s.fighters.filter(f=>f.team===t&&f.hp>0);}
 function total(s,t){return s.fighters.filter(f=>f.team===t).reduce((a,f)=>a+f.hp,0);}
 function points(s,t){return Number(s.points?.[t])||0;}
 function ensureCheerCoins(s){if(!s.cheerCoins)s.cheerCoins={left:s.config.damagePerCoin>0?s.boost.left/s.config.damagePerCoin:0,right:s.config.damagePerCoin>0?s.boost.right/s.config.damagePerCoin:0};}
 function refreshBoost(s){for(const t of ['left','right'])s.boost[t]=Math.min(s.config.damageCap,Math.round(s.cheerCoins[t]*s.config.damagePerCoin*10)/10);}
 function finish(s,now){
  if(s.phase!=='battle')return false;
  const l=total(s,'left'),r=total(s,'right'),lp=points(s,'left'),rp=points(s,'right'),winner=lp===rp?'draw':lp>rp?'left':'right';
  const eligible=s.fighters.filter(f=>winner==='draw'||f.team===winner);
  const humans=eligible.filter(f=>!f.bot),pool=humans.length?humans:eligible;
  const king=pool.slice().sort((a,b)=>(b.roundPoints||0)-(a.roundPoints||0)||b.damage-a.damage)[0];
  const record={id:`round-${s.round}-${now}`,round:s.round,at:now,winner,teams:{left:s.config.leftName,right:s.config.rightName},leftHp:l,rightHp:r,leftPoints:lp,rightPoints:rp,king:king?{id:king.id,name:king.name,team:king.team,damage:king.damage,kills:king.kills,score:Math.round(king.roundPoints||0),bot:king.bot}:null,coins:{...s.supportCoins},roster:[...s.fighters,...(s.retiredFighters||[])].map(f=>({id:f.id,name:f.name,team:f.team,damage:f.damage,kills:f.kills,healed:f.healed,points:f.roundPoints||0,bot:f.bot}))};
  s.history.unshift(record);s.history=s.history.slice(0,100);s.result=record;
  for(const f of s.fighters){const p=s.people.find(p=>p.id===f.id);if(p){if(f.team===winner)p.wins++;p.waitingSince=now;}}
  for(const p of s.people)p.team=null;
  s.phase='break';s.paused=false;s.remaining=s.config.breakSeconds;s.phaseEnd=now+s.remaining*1000;
  log(s,winner==='draw'?'Hai xóm hòa nhau! Nghỉ đón tuất mới.':`${s.config[winner==='left'?'leftName':'rightName']} chiến thắng! Vinh danh ${tuat(king?.name)}.`, 'win',now);expireDepartures(s,now);return true;
 }
 function hit(s,attacker,target,now){
  const damage=Math.min(target.hp,Math.ceil(target.maxHp/(attacker.form==='dragon'?3:7)));target.hp-=damage;target.hitAt=now;attacker.attackAt=now;attacker.damage+=damage;
  const p=s.people.find(p=>p.id===attacker.id);if(p)p.damage+=damage;
  if(target.hp===0){attacker.kills++;if(p)p.kills++;}return damage;
 }
 function award(s,f,gain){s.points||={left:0,right:0};s.points[f.team]=Math.round((points(s,f.team)+gain)*10)/10;f.roundPoints=Math.round(((f.roundPoints||0)+gain)*10)/10;f.score=f.roundPoints;const p=s.people.find(p=>p.id===f.id);if(p)p.points=(p.points||0)+gain;}
 function noteBark(s,u,now,source,count,points=0,target){
  const p=s.people.find(p=>p.id===u.id),old=p?.barkSignal||u.barkSignal,signal={seq:(old?.seq||0)+1,at:now,countTotal:(old?.countTotal||0)+count,pointsTotal:(old?.pointsTotal||0)+points,interactiveTotal:(old?.interactiveTotal||0)+(['like','comment'].includes(source)?count:0),source,team:u.team,actorForm:u.form||p?.permanentForm||'dog',target,spectator:!s.fighters.some(f=>f.id===u.id&&s.phase==='battle')};
  u.barkSignal=signal;if(p)p.barkSignal=signal;
 }
 function barkCues(s,cursor,now){
  const epoch=String(s.createdAt)+'|'+(s.resetId||'');if(cursor.epoch!==epoch){cursor.epoch=epoch;cursor.seen=new Map();cursor.initialized=false;}
  const actors=new Map();for(const u of [...(s.fighters||[]),...(s.people||[])])if(u.barkSignal&&(!actors.has(u.id)||u.barkSignal.seq>actors.get(u.id).barkSignal.seq))actors.set(u.id,u);
  const out=[];for(const [id,u]of actors){const b=u.barkSignal,old=cursor.seen.get(id);cursor.seen.set(id,b);if(!cursor.initialized||old&&b.seq<=old.seq||now-b.at<0||now-b.at>=2000)continue;const interactive=b.interactiveTotal-(old?.interactiveTotal||0)>0;out.push({...b,id:'bark-signal:'+id+':'+b.seq,kind:'bark',actor:id,soundForm:'dog',physical:false,damage:0,count:Math.max(1,b.countTotal-(old?.countTotal||0)),points:Math.max(0,b.pointsTotal-(old?.pointsTotal||0)),interactiveCount:Math.max(0,b.interactiveTotal-(old?.interactiveTotal||0)),source:interactive&&b.source==='auto'?'like':b.source});}
  cursor.initialized=true;if(cursor.seen.size>actors.size+100)for(const id of cursor.seen.keys())if(!actors.has(id))cursor.seen.delete(id);return out;
 }
 function combatBark(s,f,now,rng,source='auto',count=1){
  const targets=alive(s,other(f.team)),target=targets.length?targets[Math.floor(rng()*targets.length)]:null,gain=Math.round((s.config.baseDamage+s.boost[f.team])*count*10)/10;award(s,f,gain);f.barkAt=now;noteBark(s,f,now,source,count,gain,target?.id);
  log(s,`${tuat(f.name)} GÂU! +${gain} điểm${count>1?` · ${count} tim`:''}`,'bark',now,{actor:f.id,actorForm:f.form,soundForm:'dog',team:f.team,target:target?.id,damage:0,points:gain,physical:false,source,count});return true;
 }
 function creatureSkill(s,f,now,rng){
  const targets=alive(s,other(f.team));if(!targets.length)return false;const target=targets[Math.floor(rng()*targets.length)],damage=hit(s,f,target,now),p=s.people.find(p=>p.id===f.id);let gain=s.config.baseDamage+s.boost[f.team]+(f.form==='dragon'?24:12);if(p?.extraStrikes>0){p.extraStrikes--;gain*=2;}gain=Math.round(gain*10)/10;award(s,f,gain);f.skillReadyAt=now+30000;
  log(s,`${tuat(f.name)} ${f.form==='dragon'?'KHÈ LỬA':'CÀO & GẦM'}! −${damage} HP · +${gain} điểm · hồi 30s`,'skill',now,{actor:f.id,personId:f.id,actorForm:f.form,soundForm:f.form,team:f.team,target:target.id,targets:[f.id],gift:f.form,skillActivated:true,damage,points:gain,physical:true,source:'cooldown'});return true;
 }
 function attack(s,t,now,rng=Math.random){const a=alive(s,t).filter(f=>!f.bot);if(!a.length)return false;return combatBark(s,a[Math.floor(rng()*a.length)],now,rng);}
 function checkEnd(s,now){if(s.phase==='battle'&&s.config.earlyWin&&(!alive(s,'left').length||!alive(s,'right').length))finish(s,now);}
 function viewerBark(s,p,source,now,rng,count=1){
  if(s.paused||s.phase==='prepare')return false;const f=s.phase==='battle'?s.fighters.find(f=>f.id===p.id):null;if(f&&f.hp<=0)return false;p.barkAt=now;
  if(f)combatBark(s,f,now,rng,source,count);
  else{noteBark(s,p,now,source,count);log(s,`${tuat(p.name)} GÂU! Cổ vũ cả xóm!`,'bark',now,{actor:p.id,actorForm:p.permanentForm||'dog',soundForm:'dog',team:p.team,damage:0,points:0,source,spectator:true,count});}return true;
 }
 function freezeSkills(s,now){for(const f of s.fighters)if(f.bot)f.botBarkRemaining=Math.max(0,(f.botBarkReadyAt??now+botBarkDelay())-now);for(const f of s.fighters)if(f.form!=='dog')f.skillRemaining=Math.max(0,(f.skillReadyAt??now+30000)-now);}
 function resumeSkills(s,now){for(const f of s.fighters)if(f.bot){f.botBarkReadyAt=now+(f.botBarkRemaining??botBarkDelay());delete f.botBarkRemaining;}for(const f of s.fighters)if(f.form!=='dog'){f.skillReadyAt=now+(f.skillRemaining??30000);delete f.skillRemaining;}}
 function gift(s,c,now,rng){
  const def=GIFT_DEFS.find(g=>g.id===c.gift)||(c.gift==='support'?{id:'support',name:'Tiếp sức',icon:'✦',coins:0}:null);if(!def||!c.userId)return false;
  const p=arrive(person(s,c.userId,c.name,c.team,now),c.receivedAt??now);if(!p)return false;
  const t=def.supportTeam||(['left','right'].includes(c.team)?c.team:p.team),n=Math.floor(finite(c.count,1,1,9999)),coins=c.coins===undefined?(s.config.gifts[def.id]||def.coins)*n:finite(c.coins,0,0,1e10);
  p.coins+=coins;p.priorityCoins+=coins;
  if(s.paused){p.coins-=coins;p.priorityCoins-=coins;log(s,'Trận đang tạm dừng. Tiếp tục trước khi thử quà.','warn',now);return false;}
  if(['tiger','dragon'].includes(c.gift)){
   p.permanentForm=c.gift;p.formChangedAt=now;delete p.pendingForm;const f=['prepare','battle'].includes(s.phase)?s.fighters.find(f=>f.id===p.id):null;if(f){if(f.form!==c.gift||!f.skillReadyAt)f.skillReadyAt=now+30000;f.form=c.gift;}if(['prepare','battle'].includes(s.phase)&&p.team)s.supportCoins[p.team]+=coins;
   log(s,`${tuat(p.name)} hóa ${c.gift==='tiger'?'Hổ':'Rồng Trung Hoa'} vĩnh viễn${f?' · kỹ năng hồi 30s':' · đang đứng ngoài'}.`,'gift',now,{team:p.team,gift:c.gift,personId:p.id,actor:p.id,actorForm:c.gift,coins,count:n,targets:[p.id],skillActivated:true,transformed:true,permanent:true,effect:`Đã hóa ${c.gift==='dragon'?'rồng':'hổ'} vĩnh viễn. Kỹ năng tự động mỗi 30 giây`});return true;
  }
  if(!['prepare','battle'].includes(s.phase)){if(c.gift==='execute')p.extraStrikes=Math.min(9999,(p.extraStrikes||0)+n);log(s,`${tuat(p.name)} tặng ${def.name} · +${coins} xu ưu tiên trận tới.`,'gift',now,{team:t,gift:c.gift,personId:p.id,coins,count:n,targets:[],skillActivated:false,effect:'Quà được giữ để tiếp sức trận tới'});return true;}
  if(!t){if(c.gift==='execute')p.extraStrikes=Math.min(9999,(p.extraStrikes||0)+n);log(s,`${tuat(p.name)} tặng ${def.name} · đang chờ ghép đội.`,'gift',now,{team:null,gift:c.gift,personId:p.id,coins,count:n,targets:[],skillActivated:false,effect:'Đã ghi nhận đóng góp để xếp hạng trận tới; chưa thuộc xóm nào'});return true;}
  s.supportCoins[t]+=coins;
  const allies=alive(s,t),own=allies.find(f=>f.id===p.id);let f=own||allies.slice().sort((a,b)=>a.hp-b.hp)[0];let detail='',targets=[],healedHp=0;
  if(['rose','cake','support'].includes(c.gift)){ensureCheerCoins(s);const before=s.boost[t];s.cheerCoins[t]+=coins;refreshBoost(s);detail=`+${(s.boost[t]-before).toFixed(1)} điểm mỗi lần sủa · ${s.config[t==='left'?'leftName':'rightName']}`;}
  else if(c.gift==='heal'&&f){f=allies.slice().sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];const gain=Math.min(f.maxHp-f.hp,s.config.healHp*n);f.hp+=gain;f.healed+=gain;p.healed+=gain;healedHp=gain;if(gain>0)targets=[f.id];detail=`hồi ${gain} HP cho ${tuat(f.name)}`;}
  else if(c.gift==='revive'){
   const dead=s.fighters.filter(f=>f.team===t&&f.hp===0).slice(0,n);
   for(const u of dead){u.hp=Math.round(u.maxHp*s.config.revivePercent/100);u.hitAt=now;if(u.form!=='dog')u.skillReadyAt=now+30000;}
   targets=dead.map(u=>u.id);detail=dead.length?`hồi sinh ${dead.length} tuất`:'chưa có tuất gục để hồi sinh';
  }
  else if(c.gift==='execute'){
   p.extraStrikes=Math.min(9999,(p.extraStrikes||0)+n);f=own;detail=`giữ ${n} lượt tăng điểm kỹ năng · vẫn hồi 30s`;if(f&&f.form!=='dog')targets=[f.id];
  }else detail='không có mục tiêu phù hợp';
  log(s,`${tuat(p.name)} ${def.icon} ${def.name} ×${n} → ${detail}`, 'gift',now,{team:t,gift:c.gift,personId:p.id,actor:f?.id,actorForm:f?.form,coins,count:n,targets,healedHp,effect:detail,skillActivated:targets.length>0,transformed:!!f&&targets.length>0&&['tiger','dragon'].includes(c.gift)});checkEnd(s,now);return true;
 }
 function settings(s,v,now){
  ensureCheerCoins(s);
  const c=s.config;for(const k of ['title','leftName','rightName'])if(k in v)c[k]=String(v[k]).replace(/[<>]/g,'').trim().slice(0,35)||defaults[k];
  for(const [k,min,max] of [['prepareSeconds',0,30],['roundSeconds',1,7200],['breakSeconds',1,1800],['maxHp',50,5000],['baseDamage',1,200],['attackInterval',700,10000],['damagePerCoin',0,20],['damageCap',0,500],['healHp',1,5000],['revivePercent',1,100],['volume',0,100],['musicVolume',0,100]])if(k in v)c[k]=finite(v[k],c[k],min,max);
  for(const k of ['autoNext','earlyWin','cameraEnabled','musicEnabled'])if(typeof v[k]==='boolean')c[k]=v[k];
  c.demoFill=true;
  if('cameraStrength' in v)c.cameraStrength=finite(v.cameraStrength,1,.65,1.25);
  if('modelScale' in v)c.modelScale=finite(v.modelScale,1,.7,1.2);
  for(const k of ['modelsLeft','modelsRight'])if(Array.isArray(v[k]))c[k]=defaults.modelsLeft.map((d,i)=>MODEL_IDS.slice(0,5).includes(v[k][i])?v[k][i]:d);
  if(v.gifts&&typeof v.gifts==='object')for(const g of GIFT_DEFS)if(g.id in v.gifts)c.gifts[g.id]=Math.round(finite(v.gifts[g.id],g.coins,1,100000));
  refreshBoost(s);log(s,'Đã lưu cài đặt. HP và thời lượng áp dụng từ pha/trận tiếp theo.','settings',now);return true;
 }
 function dispatch(s,c,now=Date.now(),rng=Math.random){
  if(!c||typeof c.id!=='string'||c.id.length>128||s.processed.includes(c.id))return false;
  if(c.userId!==undefined&&(typeof c.userId!=='string'||!c.userId||c.userId.length>80))return false;
  s.processed.push(c.id);s.processed=s.processed.slice(-300);let changed=false;
  if(c.type==='reset'){if(c.confirm!=='RESET'||c.expectedCreatedAt!==s.createdAt)return false;const config=JSON.parse(JSON.stringify(s.config)),createdAt=Math.max(now,s.createdAt+1),fresh=create(createdAt);fresh.config=config;fresh.processed=[c.id];fresh.resetId=c.id;for(const k of Object.keys(s))delete s[k];Object.assign(s,fresh);log(s,'Đã reset dữ liệu trận, người chơi và chiến tích.','reset',now);changed=true;}
  else if(c.type==='join')changed=join(s,c,now);
  else if(c.type==='leave'){const p=s.people.find(p=>p.id===c.userId);if(p&&p.leftAt===undefined){p.leftAt=now;log(s,`${tuat(p.name)} đã rời LIVE · giữ chỗ 3 phút.`,'leave',now,{personId:p.id});changed=true;}}
  else if(c.type==='gift')changed=gift(s,c,now,rng);
  else if(c.type==='comment'){
   if(!c.userId)return false;const p=arrive(person(s,c.userId,c.name,c.team,now),now);if(!p)return false;
   const message=String(c.text||'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
   if(message){p.commentCount=(p.commentCount||0)+1;p.chat={id:c.id,text:message,at:now};changed=true;}
   const text=String(c.text||'').normalize('NFC').trim().toLowerCase();
   if(/^(?:gâu|gau)(?:\s+(?:gâu|gau))*$/.test(text.replace(/[!.,?…]+/g,' ').trim()))changed=viewerBark(s,p,'comment',now,rng)||changed;
  }else if(c.type==='interaction'&&['like','follow','share'].includes(c.kind)){
   const p=s.people.find(p=>p.id===c.userId);if(!p)return false;arrive(p,now);const count=Math.floor(finite(c.count,1,1,100000));p[c.kind]=(p[c.kind]||0)+count;
   log(s,c.kind==='like'?`${tuat(p.name)} thả ${count} tim!`:c.kind==='follow'?`${tuat(p.name)} vừa theo dõi kênh!`:`${tuat(p.name)} chia sẻ LIVE!`,c.kind,now,{personId:p.id,team:p.team,count});if(c.kind==='like')viewerBark(s,p,'like',now,rng,count);changed=true;
  }else if(c.type==='start'){if(s.phase==='ready')changed=start(s,now,rng);else if(s.phase==='break'){log(s,'Hết thời gian nghỉ sẽ tự chọn đội. Dùng “Bỏ qua nghỉ” để chọn ngay.','info',now);changed=true;}}
  else if(c.type==='next'){if(s.phase==='battle')changed=finish(s,now);else if(s.phase!=='prepare')changed=start(s,now,rng);}
  else if(c.type==='pause'&&s.phase!=='ready'){if(!s.paused){if(!s.preparationVoice)s.remaining=Math.max(0,(s.phaseEnd-now)/1000);freezeSkills(s,now);s.paused=true;}else{s.paused=false;resumeSkills(s,now);s.phaseEnd=now+s.remaining*1000;s.lastAttack=now;}changed=true;}
  else if(c.type==='settings'&&c.values)changed=settings(s,c.values,now);
  else if(c.type==='pin'){const p=s.people.find(p=>p.id===c.userId);if(p){p.pinned=!!c.value;changed=true;}}
  else if(c.type==='move'){const p=s.people.find(p=>p.id===c.userId);if(p&&!s.fighters.some(f=>['prepare','battle'].includes(s.phase)&&f.id===p.id)){p.team=null;changed=true;}}
  else if(c.type==='remove'){if(!s.fighters.some(f=>['prepare','battle'].includes(s.phase)&&f.id===c.userId)){s.people=s.people.filter(p=>p.id!==c.userId);changed=true;}}
  if(changed)s.revision++;return changed;
 }
 function releasePreparation(s,now){if(s.phase!=='prepare'||!s.preparationVoice)return false;delete s.preparationVoice;s.phaseEnd=now+s.remaining*1000;s.revision++;return true;}
 function expireDepartures(s,now){let changed=false;const seated=new Set(['prepare','battle'].includes(s.phase)?s.fighters.filter(f=>!f.bot).map(f=>f.id):[]);for(const p of s.people){const idle=now-activityAt(s,p)>=PRESENCE_IDLE_MS,left=p.leftAt!==undefined&&now-p.leftAt>=PRESENCE_IDLE_MS;if(p.hiddenAt||seated.has(p.id)||!idle&&!left)continue;p.hiddenAt=now||1;p.team=null;log(s,`${tuat(p.name)} rời sân sau 3 phút không tương tác.`,'depart',now,{personId:p.id});changed=true;}return changed;}
 function winLeaders(s,limit=10){return s.people.filter(p=>!p.bot&&!String(p.id).startsWith('bot-')&&p.wins>0).slice().sort((a,b)=>b.wins-a.wins||b.wins/Math.max(1,b.rounds)-a.wins/Math.max(1,a.rounds)||(b.points||0)-(a.points||0)||a.id.localeCompare(b.id)).map((p,i,a)=>({...p,rank:i&&p.wins===a[i-1].wins?0:i+1})).map((p,i,a)=>{if(!p.rank)p.rank=a[i-1].rank;return p;}).slice(0,limit);}
 function tick(s,now=Date.now(),rng=Math.random){
  const expired=expireDepartures(s,now);if(s.phase==='ready'||s.paused)return expired;
  if(s.phase==='prepare'&&s.preparationVoice){if(now<s.preparationVoice.deadline)return expired;releasePreparation(s,now);}
  s.remaining=Math.max(0,(s.phaseEnd-now)/1000);
  if(s.remaining===0){if(s.phase==='prepare'){beginBattle(s,now,rng);return true;}if(s.phase==='battle')finish(s,now);else if(s.config.autoNext)start(s,now,rng);else{s.phase='ready';s.remaining=s.config.roundSeconds;}return true;}
  let changed=expired;
  if(s.phase==='battle'&&now-s.lastAttack>=s.config.attackInterval){s.lastAttack=now;attack(s,'left',now,rng);attack(s,'right',now,rng);changed=true;}
  if(s.phase==='battle')for(const f of s.fighters.filter(f=>f.bot&&f.hp>0)){if(!Number.isFinite(f.botBarkReadyAt))f.botBarkReadyAt=now+botBarkDelay(rng);if(now>=f.botBarkReadyAt){combatBark(s,f,now,rng,'bot');f.botBarkReadyAt=now+botBarkDelay(rng);changed=true;}}
  if(s.phase==='battle')for(const f of s.fighters.filter(f=>f.hp>0&&['tiger','dragon'].includes(f.form))){if(!Number.isFinite(f.skillReadyAt)){f.skillReadyAt=now+30000;changed=true;}if(now>=f.skillReadyAt&&creatureSkill(s,f,now,rng))changed=true;}
  if(changed){checkEnd(s,now);s.revision++;}return changed;
 }
 function waiting(s){const active=new Set(['prepare','battle'].includes(s.phase)?s.fighters.filter(f=>!f.bot).map(f=>f.id):[]),people=s.people.filter(p=>!p.hiddenAt&&!active.has(p.id));return ranked({...s,people},s.updatedAt||Date.now());}
 root.TuatEngine={create,barkCues,sceneRoster,PRESENCE_IDLE_MS,activityAt,shouldWelcome,expireDepartures,winLeaders,normalizePeople,breedFor,fixedBreed,modelFor,ranked,matchmake,contribution,interactionCount,holdsRoundSeat,dispatch,tick,releasePreparation,select,waiting,total,points,freezeSkills,tuat,clean,defaults,GIFT_DEFS};
 if(typeof module!=='undefined')module.exports=root.TuatEngine;
})(typeof window!=='undefined'?window:globalThis);
