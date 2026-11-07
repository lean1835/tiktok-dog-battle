'use strict';
const {EventEmitter}=require('node:events'),{randomUUID,randomInt}=require('node:crypto');
const E=require('../src/live-engine.js');
const {DEFAULT_CONFIG,validateConfig,normalizeEvent,mapGift,sanitizeSpokenName,spokenGiftName,safeError}=require('./tiktok-adapter.cjs');
const {TikTokSession}=require('./tiktok-session.cjs'),{Speech}=require('./speech.cjs');
const {importLegacy}=require('./migrate.cjs');
const ALLOWED_COMMANDS=new Set(['join','gift','comment','start','next','pause','settings','pin','move','remove','leave','reset']);
const WELCOMES=[
 'Chào Tuất {name}, vào sân chơi nào!',
 'Chào mừng Tuất {name} đến với xóm mình!',
 'Cả xóm ơi, đón Tuất {name} nào!',
 'Tuất {name} tới rồi, chào bạn nhé!',
 'Rất vui được gặp Tuất {name} ở sân chó!',
 'Tuất {name} ơi, mừng bạn ghé chơi!',
 'Xin chào Tuất {name}, cùng vui với cả xóm nhé!',
 'Một tràng chào đón dành cho Tuất {name}!',
 'Ồ, Tuất {name} ghé xóm rồi! Chào bạn!',
 'Mừng Tuất {name} tới chơi, sân chó đang rộn ràng đây!',
 'Tuất {name} có mặt! Cả xóm chào bạn nhé!',
 'Hoan nghênh Tuất {name}, cùng cổ vũ thật vui nào!'
];
class Runtime extends EventEmitter{
 constructor({store,now=()=>Date.now(),sessionFactory=opts=>new TikTokSession(opts),speech=new Speech()}={}){
  super();Object.assign(this,{store,now,speech});this.logs=[];this.fault='';this.lastTickSave=0;this.welcomed=new Map();this.socialSpoken=new Map();this.welcomeBag=[];this.lastWelcome=-1;
  const restored=store.load();
  this.document=restored||{schema:1,sequence:0,savedAt:now(),game:E.create(now()),liveConfig:structuredClone(DEFAULT_CONFIG),receipts:{gift:[],other:[]},catalog:[],metrics:{chat:0,member:0,like:0,follow:0,share:0,gift:0,coins:0,duplicate:0,unmapped:0},pendingGifts:[]};
  this.document.pendingGifts||=[];
  this.document.game.config.demoFill=true;
  this.document.liveConfig=validateConfig(this.document.liveConfig);
  E.normalizePeople(this.document.game,now());delete this.document.game.liveAudience;
  this.wasRunningOnRestore=!!(restored&&this.document.game.phase!=='ready'&&!this.document.game.paused);
  if(this.wasRunningOnRestore){const s=this.document.game;if(!s.preparationVoice)s.remaining=Math.max(0,(s.phaseEnd-this.document.savedAt)/1000);delete s.preparationVoice;E.freezeSkills(s,this.document.savedAt);s.paused=true;s.revision++;this.log('Đã khôi phục trận đang dở và tạm dừng; bấm Tiếp tục để chơi tiếp.');}
  this.document.game.updatedAt=now();this.document.game.writer='server';
  this.tiktok=sessionFactory({onEvent:(kind,d,room)=>{try{this.ingest(kind,d,room);}catch(e){this.log('Không lưu được tương tác: '+safeError(e));}},onState:state=>{if(state.status==='connected'&&state.roomId)this.transact(d=>{d.game.liveAudience={roomId:String(state.roomId),viewers:null};});else if(state.status!=='connected'&&this.document.game.liveAudience)this.transact(d=>{delete d.game.liveAudience;});this.emit('status',state);this.log('TikTok: '+state.status+(state.error?' · '+state.error:''));}});
  speech.on('ready',item=>this.emit('speech',item));speech.on('warning',error=>{this.log('Giọng đọc: '+error);this.emit('status',{});});
  speech.on('state',()=>this.emit('status',{}));
  store.save(this.document);this.warmRoundSpeech();
 }
 log(message){this.logs.push({at:this.now(),text:String(message).slice(0,260)});this.logs=this.logs.slice(-200);this.emit('log',this.logs.at(-1));}
 status(){return{tiktok:this.tiktok.state,speech:this.speech.info(),metrics:this.document.metrics,catalog:this.document.catalog,config:this.document.liveConfig,viewers:this.viewers||0,pendingGifts:this.document.pendingGifts.length,storage:{savedAt:this.document.savedAt,recovered:this.store.recovered,error:this.fault},uptime:process.uptime()};}
 snapshot(){return{type:'snapshot',sequence:this.document.sequence,serverTime:this.now(),state:this.document.game,status:this.status()};}
 transact(change,{deferFreeInteraction=false,freeActorId,gameOnly=false}={}){
  const before=this.document.game,candidate=gameOnly?{...this.document}:deferFreeInteraction&&typeof freeActorId==='string'?this.freeInteractionCandidate(freeActorId):structuredClone(this.document),result=change(candidate);candidate.sequence++;candidate.savedAt=this.now();candidate.game.updatedAt=candidate.savedAt;candidate.game.writer='server';
  if(candidate.game.phase==='prepare'&&(before.phase!=='prepare'||before.round!==candidate.game.round)&&candidate.liveConfig.voiceEnabled&&candidate.liveConfig.readRounds&&this.roundAudioReady&&candidate.game.config.volume>0){candidate.game.preparationVoice={round:candidate.game.round,deadline:this.now()+12000};}
  try{if(!deferFreeInteraction){this.store.save(candidate);clearTimeout(this.freeSaveTimer);this.freeSaveTimer=null;}}catch(e){this.fault='Lưu dữ liệu thất bại. Trận đã tạm dừng để giữ sự kiện.';this.document.game.paused=true;this.emit('status',{});throw e;}
  this.document=candidate;this.fault='';if(deferFreeInteraction&&!this.freeSaveTimer)this.freeSaveTimer=setTimeout(()=>{try{this.flushFreeInteractions();}catch(e){this.log('Không lưu được tim: '+safeError(e));}},40);this.emit('snapshot',this.snapshot());this.narratePhase(before,candidate.game);return result;
 }
 freeInteractionCandidate(actorId){
  // Likes only touch one viewer, expired spectators, combat counters and bounded
  // event/receipt arrays. Paid gifts/config/history keep the durable full path.
  const d=this.document,g=d.game,now=this.now();return{...d,metrics:{...d.metrics},receipts:{...d.receipts,other:d.receipts.other.slice()},game:{...g,people:g.people.map(p=>p.id===actorId||!p.hiddenAt&&(now-E.activityAt(g,p)>=E.PRESENCE_IDLE_MS||p.leftAt!==undefined&&now-p.leftAt>=E.PRESENCE_IDLE_MS)?{...p}:p),fighters:g.fighters.map(f=>({...f})),points:{...g.points},events:g.events.slice(),processed:g.processed.slice()}};
 }
 flushFreeInteractions(){if(!this.freeSaveTimer)return;clearTimeout(this.freeSaveTimer);this.freeSaveTimer=null;try{this.store.save(this.document);}catch(e){this.fault='Lưu dữ liệu thất bại. Trận đã tạm dừng để giữ sự kiện.';this.document.game.paused=true;this.emit('status',{});throw e;}}
 command(command){
  if(this.fault)throw new Error(this.fault);
  if(!command||!ALLOWED_COMMANDS.has(command.type)||typeof command.id!=='string'||command.id.length>128)throw new Error('Lệnh không hợp lệ.');
  const c=structuredClone(command);delete c.coins; // Only normalized TikTok events may supply paid coin values.
  if(this.document.game.processed.includes(c.id))return{duplicate:true,applied:false};
  if(c.type==='reset'){
   if(c.confirm!=='RESET'||c.expectedCreatedAt!==this.document.game.createdAt)throw new Error('Nhập RESET và kiểm tra phiên hiện tại trước khi xóa.');
   const backup=this.store.backup(this.document);this.transact(d=>{E.dispatch(d.game,c,this.now());d.pendingGifts=[];for(const k of Object.keys(d.metrics))d.metrics[k]=0;});this.speech.clear();this.speech.cache?.clear();this.welcomed.clear();this.socialSpoken.clear();this.welcomeBag=[];this.emit('reset',{id:c.id});this.warmRoundSpeech();return{applied:true,backup};
  }
  const wasReturning=c.userId&&E.shouldWelcome(this.document.game,this.document.game.people.find(p=>p.id===c.userId),this.now());
  const applied=this.transact(d=>{if(['join','gift','comment'].includes(c.type))E.expireDepartures(d.game,this.now());const changed=E.dispatch(d.game,c,this.now());this.flushGifts(d);return changed;});
  if(applied&&(c.announce===true&&['join','gift'].includes(c.type)||wasReturning&&c.type==='comment')){
   const person=this.document.game.people.find(p=>p.id===c.userId),def=E.GIFT_DEFS.find(g=>g.id===c.gift),count=Math.min(9999,Math.max(1,Math.floor(Number(c.count)||1)));
   this.narrate({kind:c.type==='comment'?'join':c.type,returnWelcome:!!wasReturning,forceWelcome:!!wasReturning||c.type==='join',userId:c.userId,name:person?.name||c.name,skill:c.gift,giftName:def?.name,count,coins:(this.document.game.config.gifts[c.gift]||def?.coins||0)*count},'manager-demo');
  }
  if(applied&&c.type==='settings')this.warmRoundSpeech();
  return{applied};
 }
 configure(config){this.transact(d=>{d.liveConfig=validateConfig(config,d.liveConfig);});if(!this.document.liveConfig.voiceEnabled)this.speech.clear();if(!this.document.liveConfig.voiceEnabled||!this.document.liveConfig.readRounds)this.releasePreparation();this.warmRoundSpeech();return this.document.liveConfig;}
 importLegacy(state){if(this.document.game.people.length||this.document.game.round||this.document.game.history.length)throw new Error('Chỉ nhập demo cũ vào phiên máy chủ còn trống để tránh ghi đè chiến tích.');const game=importLegacy(state,this.now());this.transact(d=>d.game=game,{gameOnly:true});return{people:game.people.length,history:game.history.length};}
 async connect(username){const config=validateConfig({username},this.document.liveConfig);this.configure({username:config.username});await this.tiktok.connect(config.username,{autoReconnect:config.autoReconnect});}
 async disconnect(){await this.tiktok.disconnect();}
 chooseTeam(game,userId){return game.people.find(p=>p.id===userId)?.team||null;}
 flushGifts(d){if(d.game.paused)return;const remaining=[];for(const gift of d.pendingGifts){E.dispatch(d.game,gift,this.now());}d.pendingGifts=remaining;}
 ingest(kind,raw,room){
  if(this.fault)throw new Error(this.fault);
  const event=normalizeEvent(kind,raw,room);if(!event)return{ignored:true};
  if(kind==='roomUser'){
   this.viewers=event.viewers;
   if(event.ranking!==null||this.tiktok.state.status==='connected')this.transact(d=>{const g=d.game;if(this.tiktok.state.status==='connected')g.liveAudience={roomId:String(room),viewers:(raw.viewerCount??raw.userCount??raw.total??raw.totalUser)!=null?event.viewers:g.liveAudience?.roomId===String(room)?g.liveAudience.viewers:null};if(event.ranking===null)return;for(const p of g.people){delete p.liveRank;delete p.liveContribution;delete p.liveRankAt;}
    for(const r of event.ranking){if(!g.people.some(p=>p.id===r.userId))E.dispatch(g,{id:'rank:'+randomUUID(),type:'join',userId:r.userId,name:r.name},this.now());const p=g.people.find(p=>p.id===r.userId);if(p)Object.assign(p,{liveRank:r.rank,liveContribution:r.contribution,liveRankAt:this.now(),liveRoom:String(room),lastSeenAt:this.now()});}g.revision++;
   });
   this.emit('status',{});return{viewers:event.viewers};
  }
  const receipts=kind==='gift'?this.document.receipts.gift:this.document.receipts.other;
  if(event.eventId&&receipts.includes(event.eventId))return{duplicate:true};
  if(kind==='gift'&&!event.eventId){this.log('Quà thiếu mã sự kiện/combo: chưa cộng để tránh nhân đôi.');return{ignored:true,reason:'missing-event-id'};}
  const mapped=kind==='gift'?mapGift(event,this.document.liveConfig):null;
  if(mapped&&!mapped.coins){this.log(`Quà ${event.giftName} thiếu giá xu. Chọn giá và skill trong quy tắc quà trước.`);this.observeGift(event);return{ignored:true,reason:'missing-coins'};}
  const before=this.document.game.people.find(p=>p.id===event.userId),dormant=E.shouldWelcome(this.document.game,before,this.now()),returnWelcome=dormant||!this.welcomed.has(String(room).slice(0,128)+':'+event.userId),forceWelcome=dormant||kind==='member'&&!!event.eventId,baseId=event.eventId||randomUUID();
  this.transact(d=>{
   const list=kind==='gift'?d.receipts.gift:d.receipts.other;if(event.eventId){list.push(event.eventId);if(list.length>10000)list.splice(0,list.length-10000);}
   const game=d.game;if(kind!=='leave')E.expireDepartures(game,this.now());const t=this.chooseTeam(game,event.userId),who={userId:event.userId,name:event.name,team:t};
   const join=()=>E.dispatch(game,{...who,type:'join',id:'live:'+randomUUID()},this.now());
   if(kind!=='leave'&&(kind!=='member'||d.liveConfig.joinOnEnter))join();
   const present=game.people.find(p=>p.id===event.userId);if(present&&kind!=='leave'){delete present.leftAt;delete present.hiddenAt;present.lastInteractionAt=this.now();present.liveRoom=String(room);present.lastSeenAt=this.now();}if(this.tiktok.state.status==='connected'&&!game.liveAudience)game.liveAudience={roomId:String(room),viewers:null};
   if(kind==='leave')E.dispatch(game,{...who,type:'leave',id:'live:'+randomUUID()},this.now());
   else if(kind==='chat'){d.metrics.chat++;E.dispatch(game,{...who,type:'comment',text:event.text,id:'live:'+randomUUID()},this.now());}
   else if(kind==='gift'){
    d.metrics.gift+=event.count;d.metrics.coins+=mapped.coins;if(!mapped.mapped)d.metrics.unmapped++;
    const gift={...who,type:'gift',id:'live:'+randomUUID(),gift:mapped.skill,count:event.count,coins:mapped.coins,receivedAt:this.now()};
    if(game.paused)d.pendingGifts.push(gift);else E.dispatch(game,gift,this.now());this.addCatalog(d,event,mapped);
   }else if(['like','follow','share'].includes(kind)){
    d.metrics[kind]+=event.count||1;E.dispatch(game,{...who,type:'interaction',kind,count:event.count||1,id:'live:'+randomUUID()},this.now());
   }else if(kind==='member')d.metrics.member++;
  },{deferFreeInteraction:kind==='like',freeActorId:kind==='like'?event.userId:undefined});
  if(kind!=='leave'&&(['gift','follow','share','member'].includes(kind)||returnWelcome))this.narrate({...event,returnWelcome,forceWelcome,kind:['gift','follow','share'].includes(kind)?kind:'join',skill:mapped?.skill,coins:mapped?.coins},room);
  return{applied:true,eventId:baseId};
 }
 narrate(event,room){
  const config=this.document.liveConfig,name=sanitizeSpokenName(E.clean(event.name),config.pronunciations);if(!config.voiceEnabled)return false;
  if(event.kind==='gift'){
   if(!config.readGifts||event.coins<config.minSpeakCoins)return event.returnWelcome?this.narrate({...event,kind:'join',forceWelcome:true},room):false;
   const team=E.GIFT_DEFS.find(g=>g.id===event.skill)?.supportTeam||this.chooseTeam(this.document.game,event.userId);
   const gift=spokenGiftName(event.giftName,config.pronunciations),teamName=team?this.document.game.config[team==='left'?'leftName':'rightName']:'trận tới',applied=this.document.game.events.findLast(e=>e.kind==='gift'&&e.personId===event.userId&&e.gift===event.skill&&e.at>=this.now()-3000&&!this.document.game.paused),protectedTexts=[name,gift,teamName];let effect=applied?.effect||`Tiếp sức ${event.coins} xu cho ${teamName}`;
   if(event.skill==='heal'&&/^hồi 0 HP/.test(effect))effect='Đội đang đầy máu';
   for(const id of applied?.targets||[]){const target=this.document.game.fighters.find(f=>f.id===id);if(target){const spoken=sanitizeSpokenName(target.name,config.pronunciations);effect=effect.replace(E.tuat(target.name),'Tuất '+spoken);protectedTexts.push(spoken);}}
   const greeting=event.returnWelcome&&config.readJoins?this.peekWelcome(name)+' ':'';
   const scene={kind:'gift',event:{id:applied?.id,personId:event.userId,team,gift:event.skill,targets:applied?.targets||[],coins:event.coins,count:event.count,skillActivated:applied?.skillActivated??false,text:`${greeting?`Chào mừng ${E.tuat(event.name)} đến sân! `:''}Cảm ơn ${E.tuat(this.document.game.people.find(p=>p.id===event.userId)?.name||event.name)} tặng ${event.count} ${gift}!`}};
   const accepted=this.speech.enqueue(`${greeting}Cảm ơn Tuất ${name} tặng ${event.count} ${gift}. ${effect}.`,{voice:config.voice,priority:1,fallback:greeting?`Chào Tuất ${name}. Cảm ơn bạn tặng quà.`:`Cảm ơn Tuất ${name} tặng quà.`,pronunciations:config.pronunciations,protectedTexts,presentation:scene});if(accepted&&greeting)this.recordWelcome(event,room);return accepted;
  }
  if(['follow','share'].includes(event.kind)){
   if(!config.readSocial)return event.returnWelcome?this.narrate({...event,kind:'join',forceWelcome:true},room):false;const key=String(room).slice(0,128)+':'+event.kind+':'+event.userId,last=this.socialSpoken.get(key);if(!event.returnWelcome&&last!==undefined&&this.now()-last<30000)return false;
   const greeting=event.returnWelcome&&config.readJoins?this.peekWelcome(name)+' ':'';
   const accepted=this.speech.enqueue(`${greeting}Cảm ơn Tuất ${name} đã ${event.kind==='follow'?'theo dõi kênh':'chia sẻ buổi phát trực tiếp'}!`,{voice:config.voice,priority:0,pronunciations:config.pronunciations,protectedTexts:[name],...(greeting?{welcome:{personId:event.userId,team:this.chooseTeam(this.document.game,event.userId)}}:{})});if(accepted&&greeting)this.recordWelcome(event,room);if(accepted){this.socialSpoken.delete(key);this.socialSpoken.set(key,this.now());if(this.socialSpoken.size>1000)this.socialSpoken.delete(this.socialSpoken.keys().next().value);}return accepted;
  }
  if(!config.readJoins)return false;
  const key=String(room).slice(0,128)+':'+event.userId,last=this.welcomed.get(key);if(!event.forceWelcome&&last!==undefined&&this.now()-last<60000)return false;
  const greeting=this.peekWelcome(name);
  const accepted=this.speech.enqueue(greeting,{voice:config.voice,priority:0,fallback:`Chào Tuất ${name}.`,pronunciations:config.pronunciations,protectedTexts:[name],welcome:{personId:event.userId,team:this.chooseTeam(this.document.game,event.userId)}});
  if(accepted)this.recordWelcome(event,room);return accepted;
 }
 peekWelcome(name){
  if(!this.welcomeBag.length){this.welcomeBag=WELCOMES.map((_,i)=>i);for(let i=this.welcomeBag.length-1;i>0;i--){const j=randomInt(i+1);[this.welcomeBag[i],this.welcomeBag[j]]=[this.welcomeBag[j],this.welcomeBag[i]];}const end=this.welcomeBag.length-1;if(this.welcomeBag[end]===this.lastWelcome)[this.welcomeBag[0],this.welcomeBag[end]]=[this.welcomeBag[end],this.welcomeBag[0]];}
  return WELCOMES[this.welcomeBag.at(-1)].replace('{name}',()=>name);
 }
 recordWelcome(event,room){const key=String(room).slice(0,128)+':'+event.userId;this.lastWelcome=this.welcomeBag.pop();this.welcomed.delete(key);this.welcomed.set(key,this.now());if(this.welcomed.size>1000)this.welcomed.delete(this.welcomed.keys().next().value);}
 preparationText(){return `Hai xóm có ${Math.ceil(this.document.game.config.prepareSeconds??15)} giây chuẩn bị!`;}
 battleText(round){return `Trận ${round} bắt đầu! Thả tim và gõ gâu để tiếp sức cho đội của bạn.`;}
 warmRoundSpeech(){const c=this.document.liveConfig,g=this.document.game;if(c.voiceEnabled&&c.readRounds)for(const text of [this.preparationText(),this.battleText(g.phase==='prepare'?g.round:g.round+1)])this.speech.prepare?.(text,{voice:c.voice,pronunciations:c.pronunciations})?.catch(()=>{});}
 releasePreparation(round){const s=this.document.game;if(s.preparationVoice&&(round===undefined||round===s.round))return this.transact(d=>E.releasePreparation(d.game,this.now()));return false;}
 narratePhase(before,game){
  if(game.phase==='prepare'&&before.phase!=='prepare')this.warmRoundSpeech();
  const c=this.document.liveConfig;if(!c.voiceEnabled)return;const options={voice:c.voice,priority:2,pronunciations:c.pronunciations,protectedTexts:[game.config.leftName,game.config.rightName]};
  if(c.readRounds&&before.phase===game.phase&&game.phase!=='ready'&&before.paused!==game.paused)this.speech.enqueue(game.paused?'Trận đang tạm dừng.':'Tiếp tục trận đấu. Hai xóm sẵn sàng!',options);
  if(c.readRounds&&game.phase==='prepare'&&(before.phase!=='prepare'||before.round!==game.round))this.speech.enqueue(this.preparationText(),{...options,roundPhase:{round:game.round,phase:'prepare',sync:!!game.preparationVoice}});
  if(c.readRounds&&game.phase==='battle'&&(before.phase!=='battle'||before.round!==game.round))this.speech.enqueue(this.battleText(game.round),options);
  if(c.readWinner&&game.phase==='break'&&game.result?.id!==before.result?.id){const r=game.result,name=sanitizeSpokenName(r.king?.name,c.pronunciations),praise=`Vinh danh Tuất Vương ${name}!`;this.speech.enqueue(`${praise} ${r.winner==='draw'?'Hai xóm hòa nhau.':r.teams[r.winner]+' chiến thắng!'}`,{...options,priority:3,honorId:r.id,fallback:praise,protectedTexts:[name,...Object.values(r.teams)]});}
 }
 addCatalog(d,event,mapped){const key=event.giftId||event.giftName;let row=d.catalog.find(g=>g.key===key);if(!row){row={key};d.catalog.push(row);d.catalog=d.catalog.slice(-200);}Object.assign(row,{giftId:event.giftId,name:event.giftName,unitCoins:event.unitCoins,skill:mapped?.skill||null,mapped:!!mapped?.mapped,lastAt:this.now()});}
 observeGift(event){this.transact(d=>this.addCatalog(d,event,null));}
 tick(){
  if(this.fault)return;const game=structuredClone(this.document.game),changed=E.tick(game,this.now());
  if(changed||this.now()-this.lastTickSave>1000&&game.phase!=='ready'&&!game.paused){this.lastTickSave=this.now();this.transact(d=>d.game=game,{gameOnly:true});}
 }
 async close(){clearTimeout(this.freeSaveTimer);this.freeSaveTimer=null;this.speech.clear();await this.tiktok.disconnect();this.store.save(this.document);this.store.close();}
}
module.exports={Runtime,ALLOWED_COMMANDS};
