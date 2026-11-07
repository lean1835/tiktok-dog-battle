const {test}=require('node:test'),assert=require('node:assert/strict'),{fromStatus}=require('../src/live-broadcast.js'),{DEFAULT_CONFIG}=require('../server/tiktok-adapter.cjs'),E=require('../src/live-engine.js');
test('Live courtyard lists mapped gifts and observed coin prices, with unassigned skills clearly marked',()=>{
 const b=fromStatus({config:DEFAULT_CONFIG,tiktok:{status:'connected',username:'hannin2002'},catalog:[{giftId:'5655',name:'Rose',unitCoins:1}]},E.defaults);
 assert.equal(b.connected,true);assert.equal(b.username,'hannin2002');assert.match(b.giftRows[0].cost,/1/);assert.equal(b.giftRows.find(g=>g.id==='dragon').enabled,false);assert.equal(b.giftRows.find(g=>g.id==='dragon').names,'Chưa gán quà');assert.notEqual(b.giftRows.find(g=>g.id==='dragon').cost,'99 xu');
});
test('Gift ID mapping drives the advertised live skill and an unknown price is not presented as verified',()=>{
 const b=fromStatus({config:{giftRules:[{giftId:'5655',aliases:[],name:'Rose',skill:'dragon',unitCoins:99}]},tiktok:{status:'error'},catalog:[{giftId:'5655',name:'Rose',unitCoins:1}]},E.defaults);
 assert.equal(b.connected,false);const dragon=b.giftRows.find(g=>g.id==='dragon');assert.equal(dragon.enabled,true);assert.equal(dragon.cost,'1 xu');assert.equal(dragon.names,'Rose');
 const unobserved=fromStatus({config:{giftRules:[{giftId:'1',aliases:[],name:'Custom',skill:'heal',unitCoins:99}]}},E.defaults);assert.equal(unobserved.giftRows.find(g=>g.id==='heal').cost,'99* xu');
});

test('Gift artwork matches real gift IDs rather than skill drawings; unknown IDs stay explicitly unpictured',()=>{
 const art=require('../src/live-gift-art.js'),b=fromStatus({config:DEFAULT_CONFIG},E.defaults);assert.equal(b.giftRows.length,7);assert.deepEqual(b.giftRows.slice(0,2).map(r=>r.id),['rose','cake']);assert.equal(art.items.length,28);assert.match(art.uri('5655'),/^data:image\/webp;base64,/);assert.equal(art.uri('Rose'),art.uri('5655'));assert.equal(art.uri('unknown'),art.missing);assert.equal(art.forRule({giftId:'7610',aliases:['Rose']}),art.uri('7610'));assert.equal(art.forRule({giftId:'unknown',aliases:['Rose']}),art.missing);assert.notEqual(art.uri('5655'),art.uri('8913'));assert.equal(art.forRule({aliases:['Doughnut']}),art.uri('5879'));
});

test('Bundled real gift thumbnails match their CDN manifest hashes and stay small',()=>{
 const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),m=require('../assets/tiktok-gifts/manifest.json');let bytes=0;
 for(const g of m.items){const file=fs.readFileSync(path.resolve(__dirname,'..',g.file));assert.equal(createHash('sha256').update(file).digest('hex'),g.sha256);assert.ok(g.sourceUrl.startsWith('https://p16-webcast.tiktokcdn.com/'));assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');assert.ok(g.size.every(n=>n<=96));bytes+=file.length;}
 assert.ok(bytes<150000);
});

test('The gold board honors the winner for exactly ten seconds and reload keeps only the remaining time',()=>{
 const {honor}=require('../src/live-broadcast.js'),r={id:'r1',at:1000,round:1,winner:'left',king:{id:'a',name:'An',score:50},roster:[{id:'c',name:'C',team:'left',points:10},{id:'b',name:'B',team:'left',points:20},{id:'a',name:'An',team:'left',points:50},{id:'enemy',name:'Xanh',team:'right',points:100}]},s={phase:'break',result:r};
 assert.equal(honor(s,1000).seconds,10);assert.equal(honor(s,6000).seconds,5);assert.equal(honor(s,10999).seconds,1);assert.equal(honor(s,11000),null);assert.equal(honor(s,999),null);assert.deepEqual(honor(s,1000).top.map(p=>p.id),['a','b','c']);assert.equal(honor({...s,phase:'battle'},2000),null);
});

test('Preparation list uses the authoritative ten viewers and preserves only the remaining countdown on reload/pause',()=>{
 const {preparation}=require('../src/live-broadcast.js'),s=E.create(0);E.dispatch(s,{id:'prepare',type:'start'},1000);const before=JSON.stringify(s);assert.equal(preparation(s,1000).seconds,15);assert.equal(preparation(s,7000).seconds,9);assert.equal(preparation(s,7000).left.length,5);assert.equal(preparation(s,7000).right.length,5);assert.equal(JSON.stringify(s),before);s.paused=true;s.remaining=9;assert.equal(preparation(s,999999).seconds,9);assert.equal(preparation({...s,phase:'battle'},1000),null);
});


test('Round honors always show three unique rows with bot fallback, including one-human, two-human, all-bot and draw rounds',()=>{
 const {honor}=require('../src/live-broadcast.js');for(const humans of [0,1,2,3,5])for(const winner of ['left','draw']){const roster=Array.from({length:5},(_,i)=>({id:i<humans?'human-'+i:'bot-left-'+i,name:'Tên '+i,team:'left',bot:i>=humans,points:100-i})),king={...roster[0],score:100},state={phase:'break',result:{id:'r',at:1000,winner,king,roster}};const top=honor(state,1000).top;assert.equal(top.length,3);assert.equal(new Set(top.map(p=>p.id)).size,3);assert.equal(top[0].id,king.id);assert.equal(top.filter(p=>!p.bot).length,Math.min(humans,3));}
 const legacy=honor({phase:'break',result:{id:'old',at:1000,winner:'left',king:{id:'a',name:'An',score:10}}},1000).top;assert.equal(legacy.length,3);assert.equal(legacy[0].id,'a');assert.ok(legacy[1].placeholder&&legacy[2].placeholder);
});
test('Welcome threshold counts unique visible humans only, including fighters and spectators at 29/30/31',()=>{
 const B=require('../src/live-broadcast.js');
 for(const n of [29,30,31]){const s=E.create(1000);for(let i=0;i<n;i++)s.people.push({id:'human-'+i});s.people.push({...s.people[0]},{id:'hidden',hiddenAt:1000},{id:'bot-left-0'},{id:'synthetic',bot:true});s.fighters=[{id:'human-0'},{id:'bot-right-0',bot:true}];assert.equal(B.humanCount(s),n);assert.equal(B.welcomeMode(s),n>30?'banner':'camera');}
});
