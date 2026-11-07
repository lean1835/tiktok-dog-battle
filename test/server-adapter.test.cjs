const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../server/tiktok-adapter.cjs');
const user={id:'1234567890123456789',uniqueId:'old_handle',nickname:'Bé Na'};
test('Username validation accepts TikTok URLs without treating arbitrary domains as a username',()=>{
 assert.equal(A.cleanUniqueId('https://www.tiktok.com/@dog.house/live'),'dog.house');assert.equal(A.cleanUniqueId('@dog.house'),'dog.house');
 for(const value of ['https://evil.test/@dog','dog/../../secret','https://tiktok.com.evil.test/@dog',''])assert.throws(()=>A.cleanUniqueId(value));
});
test('v3 gift streak closes once, identity survives a username change, and ID mapping beats names',()=>{
 const raw={common:{msgId:'abc'},groupId:'g1',giftId:91,gift:{type:1,name:'Rose',diamondCount:3},repeatCount:7,repeatEnd:0,user};
 assert.equal(A.normalizeEvent('gift',raw,'room'),null);raw.repeatEnd=1;
 const e=A.normalizeEvent('gift',raw,'room');assert.equal(e.userId,'tt:'+user.id);assert.equal(e.count,7);assert.equal(e.coins,21);
 assert.equal(A.normalizeEvent('gift',{...raw,user:{...user,uniqueId:'renamed'}},'room').userId,e.userId);
 const config=A.validateConfig({giftRules:[...A.DEFAULT_CONFIG.giftRules,{giftId:'91',aliases:[],name:'Hổ',skill:'tiger',unitCoins:10}]});
 assert.deepEqual(A.mapGift(e,config),{skill:'tiger',coins:21,mapped:true});
 assert.equal(A.normalizeEvent('gift',{...raw,common:{msgId:'different-final'}},'room').eventId,e.eventId);
});
test('Legacy gift/chat/like payloads normalize without requiring extended gift fetching',()=>{
 const gift=A.normalizeEvent('gift',{msgId:'old',giftId:4,giftType:1,repeatEnd:true,repeatCount:2,giftDetails:{giftName:'Doughnut',diamondCount:10},user},'r');
 assert.equal(gift.coins,20);assert.equal(A.mapGift(gift,A.DEFAULT_CONFIG).skill,'support');assert.equal(A.mapGift({giftId:'5827',giftName:'Ice Cream Cone',unitCoins:1,count:1},A.DEFAULT_CONFIG).skill,'cake');
 assert.equal(A.normalizeEvent('chat',{user,content:'phải',common:{msgId:'m'}},'r').text,'phải');
 assert.equal(A.normalizeEvent('like',{user,likeCount:42},'r').count,42);
 assert.equal(A.normalizeEvent('member',{},'r'),null);
});
test('Unknown paid gifts support sender team points; missing coin metadata stays explicit',()=>{
 const e={giftId:'777',giftName:'New Gift',count:3,unitCoins:5};assert.deepEqual(A.mapGift(e,A.DEFAULT_CONFIG),{skill:'support',coins:15,mapped:false});
 assert.equal(A.mapGift({...e,unitCoins:0},A.DEFAULT_CONFIG).coins,0);
 assert.throws(()=>A.validateConfig({giftRules:[{giftId:'777',aliases:[],skill:'free-win'}]}));
 const config=A.validateConfig({voice:'evil',readJoins:'yes',minSpeakCoins:1e20});assert.equal(config.voice,'vi-VN-NamMinhNeural');assert.equal(config.readJoins,true);assert.equal(A.validateConfig({readJoins:false}).readJoins,false);assert.equal(config.minSpeakCoins,1000000);
});

test('Spoken gift names reuse the Vietnamese dictionary while raw gift names remain matchable',()=>{
 assert.equal(A.spokenGiftName('Rose'),'hoa hồng');assert.equal(A.spokenGiftName('Doughnut'),'bánh ngọt');assert.equal(A.spokenGiftName('Quà vui vẻ'),'Quà vui vẻ');assert.equal(A.spokenGiftName('Unknown foreign SKU'),'món quà');assert.equal(A.sanitizeSpokenName('Rose 💖'),'Rô');
});

test('Red and Blue cheer rules cannot claim the same gift ID or normalized alias',()=>{
 assert.throws(()=>A.validateConfig({giftRules:[{giftId:'1',aliases:[],skill:'rose'},{giftId:'1',aliases:[],skill:'cake'}]}),/khác nhau/);
 assert.throws(()=>A.validateConfig({giftRules:[{aliases:['Hoa Hồng'],skill:'rose'},{aliases:['hoa hong'],skill:'cake'}]}),/khác nhau/);
});


test('Room rankings accept current protobuf and legacy payloads without unsafe numeric user IDs or fabricated coin receipts',()=>{
 const rows=[{user,rank:'2',score:'123'},{user,rank:'3',score:'99'},{user:{id:'another',nickname:'An'},rank:'0',score:'-5'}];
 const v3=A.normalizeEvent('roomUser',{ranks:rows,total:'12',totalUser:'999'},'r');assert.equal(v3.viewers,12);assert.equal(v3.ranking.length,2);assert.deepEqual(v3.ranking[0],{userId:'tt:'+user.id,name:'Bé Na',rank:2,contribution:123});assert.equal(v3.ranking[1].contribution,0);
 for(const field of ['ranksList','topViewers']){const legacy=A.normalizeEvent('roomUser',{viewerCount:30,[field]:[{user,coinCount:88}]});assert.equal(legacy.ranking[0].rank,1);assert.equal(legacy.ranking[0].contribution,88);}
 assert.equal(A.normalizeEvent('roomUser',{viewerCount:12}).ranking,null);assert.deepEqual(A.normalizeEvent('roomUser',{ranks:[]}).ranking,[]);
});
