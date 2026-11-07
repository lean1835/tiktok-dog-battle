(function(root){
 'use strict';
 const items=typeof module!=='undefined'&&module.exports?require('../assets/tiktok-gifts/manifest.json').items.map(g=>({...g,data:'data:image/webp;base64,'+require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../',g.file)).toString('base64')})):__REAL_GIFTS__;
 const normal=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim();
 const aliases={'hoa hong':'Rose','hoa':'Rose','banh':'Doughnut','donut':'Doughnut'};
 const missing='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="8" y="8" width="80" height="80" rx="12" fill="#e8e7dc"/><text x="48" y="62" text-anchor="middle" font-family="Arial" font-size="42" fill="#85917c">?</text></svg>');
 function find(value){const v=String(value||''),n=normal(value),name=normal(aliases[n]||v);return items.find(g=>g.id===v)||items.find(g=>normal(g.name)===name);}
 function uri(value){return find(value)?.data||missing;}
 function forRule(rule,catalog=[]){if(!rule)return missing;if(rule.giftId)return uri(rule.giftId);const observed=catalog.find(g=>(rule.aliases||[]).some(a=>normal(a)===normal(g.name)));if(observed&&find(observed.giftId))return uri(observed.giftId);return (rule.aliases||[]).map(find).find(Boolean)?.data||find(rule.name)?.data||missing;}
 const examples={rose:'5655',cake:'5827',tiger:'18198',dragon:'7610',heal:'5487',revive:'5659',execute:'5509'};
 root.TuatGiftArt={uri,forRule,find,items,demoUri:skill=>uri(examples[skill]),missing};if(typeof module!=='undefined')module.exports=root.TuatGiftArt;
})(typeof window!=='undefined'?window:globalThis);
