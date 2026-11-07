import broadcastPolicy from './live-broadcast.js';
export const ORBIT_INTERVAL_MS=15000;
export const ORBIT_DURATION_MS=8000;
const shots={welcome:{priority:1,duration:3000,cooldown:8000,zoom:3.1},gift:{priority:2,duration:3400,cooldown:4000,zoom:2.8},skill:{priority:3,duration:4200,cooldown:4800,zoom:3.6},orbit:{priority:-1,duration:ORBIT_DURATION_MS,cooldown:0,zoom:1.55}};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export class LiveCameraDirector{
 constructor(){this.seen=new Set();this.initialized=false;this.active=null;this.last={};this.wideUntil=0;this.sequence=0;this.nextAt=null;this.context=null;this.orbitSequence=0;}
 reset(){this.active=null;this.pending=null;}
 classify(event,state){
  if(event.kind==='join'&&event.personId)return broadcastPolicy.welcomeMode(state)==='camera'?'welcome':null;
  if(event.kind==='skill'&&event.physical&&['tiger','dragon'].includes(event.actorForm)&&state.phase==='battle'&&!state.paused)return 'skill';
  if(event.kind==='gift')return state.phase==='battle'&&!['rose','cake'].includes(event.gift)&&event.gift&&event.skillActivated!==false?'skill':'gift';
  return null;
 }
 consume(state,now,{reducedMotion=false,deferWelcomes=false,deferGifts=false,minSpeakCoins=1}={}){
  const events=state.events||[],fresh=events.filter(e=>!this.seen.has(e.id));for(const e of events)this.seen.add(e.id);if(this.seen.size>240)this.seen=new Set(events.map(e=>e.id));
  const context=`${state.round||0}:${state.phase}`;
  if(this.context!==context||this.nextAt===null){this.reset();this.context=context;this.nextAt=now+ORBIT_INTERVAL_MS;}
  if(!this.initialized){this.initialized=true;return null;}
  if(state.phase==='prepare'||state.config.cameraEnabled===false||reducedMotion){this.reset();this.nextAt=now+ORBIT_INTERVAL_MS;return null;}
  if(state.paused){this.nextAt=now+ORBIT_INTERVAL_MS;if(this.active?.kind==='orbit')this.reset();}
  if((deferWelcomes||broadcastPolicy.welcomeMode(state)==='banner')&&this.pending?.kind==='welcome')this.pending=null;
  const waits=e=>deferWelcomes&&e.kind==='join'||deferGifts&&e.kind==='gift'&&e.coins>=minSpeakCoins;
  if(this.pending&&waits(this.pending.event))this.pending=null;
  const candidates=fresh.filter(e=>now-e.at<3500&&e.at-now<700&&!waits(e)).map(event=>({event,kind:this.classify(event,state)})).filter(c=>c.kind);
  candidates.sort((a,b)=>shots[b.kind].priority-shots[a.kind].priority||b.event.at-a.event.at);
  const skills=candidates.filter(c=>c.event.kind==='skill').map(c=>c.event);let selected=null;
  for(const c of candidates.filter(c=>c.event.kind!=='skill')){const shot=this.request(c.kind,c.event,now);if(shot){selected=shot;break;}const spec=shots[c.kind];if(spec.priority>0&&this.wideUntil>now&&this.wideUntil-now<=1800&&now-(this.last[c.kind]??-Infinity)>=spec.cooldown&&(!this.pending||spec.priority>=shots[this.pending.kind].priority))this.pending=c;}
  if(skills.length)return this.skillPresentation(skills,now);
  if(selected)return selected;
  if(this.pending){if(now-this.pending.event.at>=3500)this.pending=null;else if(now>=this.wideUntil){const c=this.pending;this.pending=null;return this.request(c.kind,c.event,now);}}
  const honor=state.phase==='break'&&state.result&&now-state.result.at>=0&&now-state.result.at<10000;
  if(now>=this.nextAt){const late=now-this.nextAt;this.nextAt=late>1500?now+ORBIT_INTERVAL_MS:this.nextAt+ORBIT_INTERVAL_MS;if(!state.paused&&!honor&&late<=1500)return this.request('orbit',{},now);}
  return null;
 }
 request(kind,event,now,manual=false){
  const spec=shots[kind];if(!spec)return null;
  if(!manual){if(now-(this.last[kind]??-Infinity)<spec.cooldown)return null;if(this.active&&now<this.active.ends){if(spec.priority<=this.active.priority)return null;}else if(now<this.wideUntil)return null;}
  const shot={...spec,kind,event,start:now,ends:now+spec.duration,id:++this.sequence,manual};if(kind==='orbit')shot.direction=++this.orbitSequence%2?1:-1;
  this.active=shot;this.pending=null;this.last[kind]=now;this.wideUntil=shot.ends+1400;return shot;
 }
 skillPresentation(events,now){
  // One frame contains simultaneous attacks; never queue a replay after their effects.
  const previous=this.active,keep=previous&&previous.ends>now&&previous.kind!=='orbit';
  const shot=keep?previous:this.request('skill',events[0],now,true);shot.manual=false;
  shot.skillEvents=[...new Map([...(shot.skillEvents||[]).filter(e=>now-e.at<4200),...events].map(e=>[e.id,e])).values()].slice(-20);shot.frameRevision=(shot.frameRevision||0)+1;
  if(!shot.speechId){shot.ends=Math.max(shot.ends,now+4200);shot.duration=shot.ends-shot.start;this.wideUntil=shot.ends+1400;}return shot;
 }
 spokenPresentation(kind,event,now,duration,speechId){const skills=(this.active?.skillEvents||[]).filter(e=>now-e.at<4200),shot=this.request(kind,event,now,true);if(skills.length)shot.skillEvents=skills;shot.manual=false;shot.speechId=speechId;shot.priority=4;shot.duration=Math.min(35000,Math.max(10,duration*1000))+850;shot.ends=now+shot.duration;this.wideUntil=shot.ends+1400;return shot;}
 spokenWelcome(event,now,duration,speechId){return this.spokenPresentation('welcome',event,now,duration,speechId);}
 sample(now){const s=this.active;if(!s)return null;if(now>=s.ends){this.active=null;return null;}return{...s,amount:Math.min(smooth((now-s.start)/(s.kind==='orbit'?1200:650)),smooth((s.ends-now)/(s.kind==='orbit'?1400:850))),progress:Math.max(0,Math.min(1,(now-s.start)/s.duration))};}
}
