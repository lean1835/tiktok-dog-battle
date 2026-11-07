'use strict';
// Adapted from Chánh Điện Tịnh Tâm live/tiktok-adapter.mjs.
// Copyright (c) 2026 Kent Juno, MIT; full notice: assets/licenses/chanh-dien-MIT.txt.
const {createHash}=require('node:crypto');
const {sanitizeSpokenName,spokenGiftName,validatePronunciations}=require('./pronunciation.cjs');
const text=(value,max=80)=>String(value??'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,max);
const number=(value,fallback=0,max=1e9)=>Number.isFinite(Number(value))?Math.min(max,Math.max(0,Math.floor(Number(value)))):fallback;
function cleanUniqueId(value){
 let s=String(value||'').trim();
 if(/^https?:\/\//i.test(s)){
  const u=new URL(s);if(!/(^|\.)tiktok\.com$/i.test(u.hostname))throw new Error('Chỉ nhận tên kênh hoặc link tiktok.com.');
  s=u.pathname.split('/').find(p=>p.startsWith('@'))||'';
 }
 s=s.replace(/^@/,'').replace(/\/live\/?$/,'');
 if(!/^[a-zA-Z0-9_.]{1,32}$/.test(s))throw new Error('Nhập @username TikTok hợp lệ.');
 return s;
}
function extractUser(d){
 const u=d?.user||d||{},raw=u.idStr||u.userId||u.id||u.uniqueId||u.displayId||d?.userId||d?.uniqueId;
 if(!raw)return null;
 const value=String(raw),id='tt:'+(value.length>76?createHash('sha256').update(value).digest('hex'):value);
 return{id,name:text(u.nickname||u.displayId||u.uniqueId||d?.nickname||'Ẩn danh',32)};
}
function normalizeEvent(kind,d,roomId='unknown'){
 if(!d||typeof d!=='object')return null;
 if(kind==='roomUser'){
  // v3 protobuf: ranks/score/rank; legacy connector: topViewers or ranksList/coinCount.
  const rows=Array.isArray(d.ranks)?d.ranks:Array.isArray(d.ranksList)?d.ranksList:Array.isArray(d.topViewers)?d.topViewers:null,seen=new Set();
  const ranking=rows===null?null:rows.slice(0,500).flatMap((r,i)=>{const u=extractUser(r);if(!u||seen.has(u.id))return[];seen.add(u.id);return[{userId:u.id,name:u.name,rank:number(r.rank??r.rankIndex??r.index,i+1,100000)||i+1,contribution:number(r.coinCount??r.score??r.coins,0,1e12)}];});
  return{kind,viewers:number(d.viewerCount??d.userCount??d.total??d.totalUser),ranking,id:null};
 }
 const user=extractUser(d);if(!user)return null;
 const common=d.common||{},msg=common.msgId||d.msgId,created=common.createTime||d.createTime;
 let id=msg?`${roomId}:${kind}:${String(msg)}`:null;
 const event={kind,userId:user.id,name:user.name,eventId:id,at:Date.now()};
 if(kind==='chat')event.text=text(d.comment??d.content,200);
 if(kind==='like')event.count=number(d.likeCount??d.count,1,100000)||1;
 if(kind==='gift'){
  const g=d.gift||d.giftDetails||d.extendedGiftInfo||{},extended=d.extendedGiftInfo||{};
  const type=number(g.type??g.giftType??d.giftType),isCombo=type===1||g.combo===true;
  const end=d.repeatEnd===true||d.repeatEnd===1||d.repeatEnd==='1';
  if(isCombo&&!end)return null; // Never mark a still-growing streak as received.
  const group=d.groupId??d.streakId,giftId=String(d.giftId??g.id??g.giftId??extended.id??'');
  if(isCombo&&group&&String(group)!=='0')id=`${roomId}:gift:group:${group}:${user.id}:${giftId}`;
  const unit=number(g.diamondCount??g.diamond_count??extended.diamondCount??d.diamondCount,0,1000000);
  Object.assign(event,{giftId:text(giftId,32),giftName:text(g.name||g.giftName||extended.name||d.giftName||d.describe||'Quà chưa có tên',60),count:number(d.repeatCount??d.count,1,9999)||1,unitCoins:unit,eventId:id});
  event.coins=unit*event.count;
 }
 if(!event.eventId&&created)event.eventId=`${roomId}:${kind}:`+createHash('sha256').update(JSON.stringify([user.id,String(created),event.text,event.giftId,event.count,event.coins])).digest('hex');
 return event;
}
const normalizeName=s=>text(s,60).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const DEFAULT_RULES=[
 {giftId:'5655',name:'Rose · Cổ vũ Đỏ',aliases:['rose','hoa hồng'],skill:'rose',unitCoins:1},
 {giftId:'5827',name:'Kem ốc quế · Cổ vũ Xanh',aliases:['ice cream cone','kem ốc quế','kem'],skill:'cake',unitCoins:1}
];
const DEFAULT_CONFIG={username:'',autoReconnect:true,joinOnEnter:true,voiceEnabled:true,voice:'vi-VN-NamMinhNeural',readJoins:true,readGifts:true,readWinner:true,readRounds:true,readSocial:true,minSpeakCoins:1,pronunciations:[],giftRules:DEFAULT_RULES};
function validateConfig(input,previous=DEFAULT_CONFIG){
 const c=structuredClone(previous);if(!input||typeof input!=='object')return c;
 if('username'in input)c.username=input.username?cleanUniqueId(input.username):'';
 for(const k of ['autoReconnect','joinOnEnter','voiceEnabled','readJoins','readGifts','readWinner','readRounds','readSocial'])if(typeof input[k]==='boolean')c[k]=input[k];
 if(['vi-VN-NamMinhNeural','vi-VN-HoaiMyNeural','windows-vi'].includes(input.voice))c.voice=input.voice;
 if('minSpeakCoins'in input)c.minSpeakCoins=number(input.minSpeakCoins,1,1000000);
 if('pronunciations'in input)c.pronunciations=validatePronunciations(input.pronunciations);
 if(Array.isArray(input.giftRules))c.giftRules=input.giftRules.slice(0,200).map(r=>{
  if(!r||!['rose','cake','heal','revive','tiger','dragon','execute'].includes(r.skill))throw new Error('Skill quà không hợp lệ.');
  const giftId=text(r.giftId,32);if(giftId&&!/^\d+$/.test(giftId))throw new Error('Gift ID chỉ gồm chữ số.');
  const aliases=(Array.isArray(r.aliases)?r.aliases:[]).map(s=>text(s,60)).filter(Boolean).slice(0,10);
  if(!giftId&&!aliases.length)throw new Error('Mỗi quy tắc cần Gift ID hoặc tên quà.');
  return{giftId,name:text(r.name||aliases[0]||giftId,60),aliases,skill:r.skill,unitCoins:number(r.unitCoins,0,1000000)};
 });
 const red=c.giftRules.filter(r=>r.skill==='rose'),blue=c.giftRules.filter(r=>r.skill==='cake');
 if(red.some(a=>blue.some(b=>(a.giftId&&a.giftId===b.giftId)||a.aliases.some(n=>b.aliases.some(m=>normalizeName(n)===normalizeName(m))))))throw new Error('Quà cổ vũ Đỏ và Xanh phải dùng Gift ID/tên quà khác nhau.');
 return c;
}
function mapGift(event,config){
 const rules=config.giftRules||[],r=rules.find(r=>r.giftId&&r.giftId===event.giftId)||rules.find(r=>r.aliases.some(n=>normalizeName(n)===normalizeName(event.giftName)));
 const unitCoins=event.unitCoins||r?.unitCoins||0;
 return{skill:r?.skill||'support',coins:unitCoins*event.count,mapped:!!r};
}
function safeError(error){
 let message=String(error?.message||error?.info||error||'Lỗi chưa rõ');
 for(const key of [process.env.SIGN_API_KEY,process.env.TIKTOK_SIGN_API_KEY])if(key)message=message.split(key).join('[ẩn khóa]');
 return message.replace(/(api[_ -]?key|authorization|token|cookie)\s*[:=]\s*[^\s,;]+/gi,'$1=[ẩn]').slice(0,240);
}
module.exports={text,number,cleanUniqueId,normalizeEvent,mapGift,validateConfig,DEFAULT_CONFIG,safeError,sanitizeSpokenName,spokenGiftName};
