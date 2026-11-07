'use strict';
const {randomUUID}=require('node:crypto'),E=require('../src/live-engine.js'),{number,text}=require('./tiktok-adapter.cjs');
function importLegacy(source,now){
 if(source?.version!==3||!Array.isArray(source.people)||!Array.isArray(source.history)||source.history.length>100)throw new Error('Bản sao demo không đúng định dạng Tuất Live.');
 const target=E.create(now);E.dispatch(target,{id:randomUUID(),type:'settings',values:source.config||{}},now);
 for(const old of source.people){
  if(typeof old.id!=='string'||!old.id||old.id.length>80||target.people.some(p=>p.id===old.id))continue;
  E.dispatch(target,{id:randomUUID(),type:'join',userId:old.id,name:old.name,team:old.team},now);const p=target.people.at(-1);
  for(const key of ['coins','priorityCoins','wins','kills','damage','healed','rounds','lastPlayed'])p[key]=number(old[key],0,1e12);
  if(['shiba','husky','pug','becgie','corgi'].includes(old.breed))p.breed=old.breed;
  if(['tiger','dragon'].includes(old.permanentForm||old.pendingForm))p.permanentForm=old.permanentForm||old.pendingForm;
  p.pinned=old.pinned===true;p.waitingSince=number(old.waitingSince,now,now);p.joinedAt=number(old.joinedAt,now,now);
  if(['shiba','husky','pug','becgie','corgi'].includes(old.preferredBreed))p.breed=old.preferredBreed;
  p.assignedBreed=p.breed;
 }
 const name=value=>text(value,35)||'Ẩn danh';
 target.history=source.history.map(r=>({id:text(r.id,100),round:number(r.round),at:number(r.at,now,now),winner:['left','right','draw'].includes(r.winner)?r.winner:'draw',teams:{left:name(r.teams?.left),right:name(r.teams?.right)},leftHp:number(r.leftHp),rightHp:number(r.rightHp),king:r.king?{id:text(r.king.id,80),name:name(r.king.name),team:r.king.team==='right'?'right':'left',damage:number(r.king.damage),kills:number(r.king.kills),score:number(r.king.score),bot:!!r.king.bot}:null,coins:{left:number(r.coins?.left),right:number(r.coins?.right)},roster:[]}));
 E.normalizePeople(target);target.round=number(source.round,0,1e6);target.events=[];target.processed=[];target.revision++;return target;
}
module.exports={importLegacy};
