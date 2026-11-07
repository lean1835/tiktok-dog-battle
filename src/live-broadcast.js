(function(root){
 'use strict';
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
 function humanCount(state){return new Set((state.people||[]).filter(p=>!p.bot&&!String(p.id).startsWith('bot-')&&!p.hiddenAt).map(p=>p.id)).size;}
 function welcomeMode(state){return humanCount(state)>30?'banner':'camera';}
 function fromStatus(status,config){
  const rules=status.config?.giftRules||[],catalog=status.catalog||[];
  const definition=[['rose','CỔ VŨ ĐỎ',['rose'],'Tăng điểm sủa bên Đỏ'],['cake','CỔ VŨ XANH',['cake'],'Tăng điểm sủa bên Xanh'],['tiger','HÓA HỔ',['tiger'],'Hồi 30s · 7 đòn/tuất'],['dragon','HÓA RỒNG',['dragon'],'Hồi 30s · 3 đòn/tuất'],['heal','HỒI HP',['heal'],`Hồi ${config.healHp} HP`],['revive','HỒI SINH',['revive'],`Sống lại ${config.revivePercent}% HP`],['execute','TẮT LIVE',['execute'],'']];
  const giftRows=definition.map(([id,title,skills,description])=>{
   const matching=rules.filter(rule=>skills.includes(rule.skill));
   const items=matching.slice(0,2).map(rule=>{
    const observed=catalog.find(g=>rule.giftId?g.giftId===rule.giftId:rule.aliases.some(a=>normalize(a)===normalize(g.name)));
    return{name:rule.name||rule.aliases[0]||'ID '+rule.giftId,coins:observed?.unitCoins||0,fallback:rule.unitCoins||0,imageKey:observed?.giftId||rule.giftId||rule.aliases[0]||rule.name};
   });
   return{id,title,enabled:!!items.length,imageKey:items[0]?.imageKey||'',names:items.length?items.map(i=>i.name).join(' / ').slice(0,56):'Chưa gán quà',cost:items.length?items.map(i=>i.coins?i.coins:i.fallback?i.fallback+'*':'?').join(' / ')+' xu':'—',description};
  });
  return{mode:'server',connected:status.tiktok?.status==='connected',username:status.tiktok?.username||'',giftRows};
 }
 function honor(state,now){
  const r=state.result,age=r?now-r.at:Infinity;if(state.phase!=='break'||!r||age<0||age>=10000)return null;
  const eligible=(r.roster||[]).filter(p=>r.winner==='draw'||p.team===r.winner),isBot=p=>p.bot||String(p.id).startsWith('bot-');
  const unique=[...new Map(eligible.map(p=>[p.id,p])).values()];
  if(r.king&&!unique.some(p=>p.id===r.king.id))unique.push({...r.king,points:r.king.score||0});
  const top=unique.sort((a,b)=>Number(b.id===r.king?.id)-Number(a.id===r.king?.id)||Number(isBot(a))-Number(isBot(b))||(b.points||0)-(a.points||0)||(b.damage||0)-(a.damage||0)||String(a.id).localeCompare(String(b.id))).slice(0,3);
  while(top.length<3)top.push({id:'honor-empty-'+top.length,name:'Chưa có dữ liệu',points:0,placeholder:true});
  return{...r,top,seconds:Math.ceil((10000-age)/1000)};
 }
 function preparation(state,now){if(state.phase!=='prepare')return null;return{round:state.round,seconds:Math.max(0,Math.ceil(state.paused||state.preparationVoice?state.remaining:(state.phaseEnd-now)/1000)),paused:state.paused,left:state.fighters.filter(f=>f.team==='left').sort((a,b)=>a.slot-b.slot),right:state.fighters.filter(f=>f.team==='right').sort((a,b)=>a.slot-b.slot)};}
 root.TuatBroadcast={fromStatus,honor,preparation,humanCount,welcomeMode};if(typeof module!=='undefined')module.exports=root.TuatBroadcast;
})(typeof window!=='undefined'?window:globalThis);
