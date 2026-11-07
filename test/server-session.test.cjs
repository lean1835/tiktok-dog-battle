const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {TikTokSession}=require('../server/tiktok-session.cjs');
function fake(){
 const connections=[],timers=[];class Connection extends EventEmitter{constructor(name,options){super();Object.assign(this,{name,options});connections.push(this);}async connect(){return{roomId:'room-'+this.name};}async disconnect(){this.disconnected=true;}}
 return{connections,timers,lib:{TikTokLiveConnection:Connection,WebcastEvent:{CHAT:'chat',GIFT:'gift',MEMBER:'member',LIKE:'like',FOLLOW:'follow',SHARE:'share',ROOM_USER:'roomUser',STREAM_END:'streamEnd'},ControlEvent:{ERROR:'error',DISCONNECTED:'disconnected'}},setTimer:(fn,delay)=>{const t={fn,delay};timers.push(t);return t;},clearTimer:t=>{if(t)t.cancelled=true;}};
}
test('Installed connector has the modern connection class and all subscribed event constants',async()=>{
 const lib=await import('tiktok-live-connector');assert.equal(typeof lib.TikTokLiveConnection,'function');for(const key of ['CHAT','GIFT','MEMBER','LIKE','FOLLOW','SHARE','ROOM_USER','STREAM_END'])assert.equal(typeof lib.WebcastEvent[key],'string');
});
test('Reconnect uses bounded backoff and old connections cannot emit game actions',async()=>{
 const f=fake(),events=[],s=new TikTokSession({...f,random:()=>0,load:async()=>f.lib,onEvent:(...e)=>events.push(e)});await s.connect('@dog');
 const first=f.connections[0];assert.equal(first.options.processInitialData,false);assert.equal(first.options.enableExtendedGiftInfo,false);first.emit('chat',{comment:'gau'});assert.equal(events.length,1);
 first.emit('disconnected');assert.equal(s.state.status,'reconnecting');const retry=f.timers.find(t=>t.delay===2000&&!t.cancelled);assert.ok(retry);retry.fn();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(s.state.status,'connected');assert.equal(f.connections.length,2);first.emit('gift',{});assert.equal(events.length,1);await s.disconnect();assert.equal(s.state.status,'idle');
});
test('An auth failure stops retries instead of hammering the signing service',async()=>{
 const f=fake();f.lib.TikTokLiveConnection.prototype.connect=async()=>{throw new Error('401 API key is invalid');};
 const s=new TikTokSession({...f,load:async()=>f.lib});await s.connect('dog');assert.equal(s.state.status,'error');assert.equal(s.wanted,false);assert.ok(!f.timers.some(t=>!t.cancelled));
});

test('A channel that is not LIVE stops polling and tells the operator to start LIVE before connecting',async()=>{
 const f=fake();f.lib.TikTokLiveConnection.prototype.connect=async()=>{throw new Error("The requested user isn't online :(");};
 const s=new TikTokSession({...f,load:async()=>f.lib});await s.connect('hannin2002');assert.equal(s.state.status,'offline');assert.equal(s.wanted,false);assert.equal(s.state.nextRetryAt,0);assert.match(s.state.error,/Bắt đầu LIVE/);assert.ok(!f.timers.some(t=>!t.cancelled));assert.equal(f.connections[0].disconnected,true);
});
test('Disconnect cancels a pending connection and stream end is terminal',async()=>{
 const f=fake();let release;f.lib.TikTokLiveConnection.prototype.connect=()=>new Promise(resolve=>release=resolve);
 const s=new TikTokSession({...f,load:async()=>f.lib}),pending=s.connect('dog');await new Promise(resolve=>setImmediate(resolve));await s.disconnect();release({roomId:'old'});await pending;assert.equal(s.state.status,'idle');
 f.lib.TikTokLiveConnection.prototype.connect=async()=>({roomId:'new'});await s.connect('dog');f.connections.at(-1).emit('streamEnd',{});assert.equal(s.state.status,'ended');assert.equal(s.wanted,false);
});
test('Two connect requests racing through disposal retain only the latest username',async()=>{
 const f=fake(),s=new TikTokSession({...f,load:async()=>f.lib});await s.connect('original');let dispose;f.connections[0].disconnect=()=>new Promise(resolve=>dispose=resolve);
 const stale=s.connect('stale');await s.connect('latest');dispose();await stale;assert.equal(s.state.username,'latest');assert.equal(s.connection.name,'latest');await s.disconnect();
});

test('Events arriving during connect use the resolved room context rather than a previous room ID',async()=>{
 const f=fake(),received=[];f.lib.TikTokLiveConnection.prototype.connect=async function(){this.roomId='current-room';this.emit('gift',{giftId:1});return{roomId:this.roomId};};
 const s=new TikTokSession({...f,load:async()=>f.lib,onEvent:(kind,data,room)=>received.push(room)});s.state.roomId='old-room';await s.connect('dog');assert.deepEqual(received,['current-room']);await s.disconnect();
});

test('A connection that opens after its deadline is closed without disturbing the replacement channel',async()=>{
 const f=fake();let finish;
 f.lib.TikTokLiveConnection.prototype.connect=function(){if(this.name==='slow')return new Promise(resolve=>finish=resolve).then(()=>{this.open=true;return{roomId:'late-room'};});this.open=true;return Promise.resolve({roomId:'new-room'});};
 f.lib.TikTokLiveConnection.prototype.disconnect=async function(){this.open=false;this.disconnected=true;};
 const received=[],s=new TikTokSession({...f,load:async()=>f.lib,onEvent:(...event)=>received.push(event)}),pending=s.connect('slow');await new Promise(resolve=>setImmediate(resolve));
 f.timers.find(t=>t.delay===25000&&!t.cancelled).fn();await pending;assert.equal(s.state.status,'reconnecting');assert.equal(f.connections[0].open,false);
 await s.connect('replacement');const latest=s.connection;assert.equal(latest.open,true);
 finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.connections[0].open,false,'late successful connect must not leave an orphan socket');assert.equal(s.connection,latest);assert.equal(latest.open,true);assert.equal(s.state.status,'connected');assert.equal(s.state.username,'replacement');f.connections[0].emit('gift',{});assert.equal(received.length,0);await s.disconnect();
});
