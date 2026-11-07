const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/live-audio-session.js'),'utf8'),{window});
const Session=window.TuatAudioSession;
function fixture(){
 const storage=new Map();let time=10000;
 function create(id){
  const audio={ctx:null,stops:0,async unlock(){this.ctx={state:'running'};},stop(){this.stops++;}};
  const session=new Session({audio,id,read:k=>storage.get(k),write:(k,v)=>storage.set(k,v),now:()=>time});
  return{audio,session};
 }
 return{storage,create,advance:ms=>time+=ms};
}

test('Reload preserves sound preference, including an explicit mute',async()=>{
 const f=fixture(),first=f.create('first');assert.equal(first.session.requested,true);await first.session.enable({manual:true});first.session.release();
 const reload=f.create('reload');assert.equal(reload.session.requested,true);await reload.session.enable();assert.equal(reload.session.canOutput(),true);
 reload.session.disable();assert.equal(reload.audio.stops,1);const muted=f.create('muted');assert.equal(muted.session.requested,false);assert.equal(muted.session.state,'muted');
});

test('A blocked startup recovers on a click; a later browser suspension is visible',async()=>{
 const {create}=fixture(),{session,audio}=create('overlay');
 audio.unlock=async()=>{const e=new Error('Tap to allow audio');e.code='AUDIO_GESTURE';throw e;};
 assert.equal(await session.enable(),false);assert.equal(session.state,'needs-gesture');assert.equal(session.canOutput(),false);
 audio.unlock=async()=>{audio.ctx={state:'running'};};assert.equal(await session.enable({manual:true}),true);assert.equal(session.output,true);
 audio.ctx.state='suspended';session.sync();assert.equal(session.state,'needs-gesture');assert.equal(session.output,false);assert.equal(audio.stops,1);
});

test('Manager and overlay share one output, with explicit takeover and global mute',async()=>{
 const f=fixture(),manager=f.create('manager'),overlay=f.create('overlay');
 await manager.session.enable();await overlay.session.enable();assert.equal(manager.session.canOutput(),true);assert.equal(overlay.session.canOutput(),false);
 await overlay.session.enable({manual:true});assert.equal(manager.session.canOutput(),false);assert.equal(manager.audio.stops,1);assert.equal(overlay.session.canOutput(),true);
 overlay.session.disable();manager.session.sync();assert.equal(manager.session.requested,false);assert.equal(manager.session.canOutput(),false);
});

test('A remaining page takes over after the audible page closes or stops refreshing its lease',async()=>{
 const f=fixture(),a=f.create('a'),b=f.create('b');await a.session.enable();await b.session.enable();a.session.release();assert.equal(b.session.canOutput(),true);
 f.advance(6000);assert.equal(a.session.canOutput(),true);assert.equal(b.session.canOutput(),false);
});

test('Muting while an autoplay request is pending cannot switch sound back on',async()=>{
 const {create}=fixture(),{session,audio}=create('a');let release;
 audio.unlock=()=>new Promise(resolve=>release=()=>{audio.ctx={state:'running'};resolve();});
 const pending=session.enable();session.disable();release();assert.equal(await pending,false);assert.equal(session.state,'muted');assert.equal(session.canOutput(),false);
});


test('Default-on startup overrides an old saved mute while a new explicit mute still silences the current session',async()=>{
 const storage=new Map([['tuat-live-v3:audio-enabled','off']]),audio={ctx:null,async unlock(){this.ctx={state:'running'};},stop(){}},session=new Session({audio,id:'default',defaultOn:true,read:k=>storage.get(k),write:(k,v)=>storage.set(k,v)});assert.equal(session.requested,true);await session.enable();assert.equal(session.canOutput(),true);session.disable();assert.equal(session.requested,false);assert.equal(session.canOutput(),false);
});
