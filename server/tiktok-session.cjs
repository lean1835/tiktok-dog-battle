'use strict';
// Lifecycle derives from Chánh Điện's connection generation guard; adds deadlines/backoff.
const {cleanUniqueId,safeError}=require('./tiktok-adapter.cjs');
class TikTokSession{
 constructor({onEvent=()=>{},onState=()=>{},load=()=>import('tiktok-live-connector'),setTimer=setTimeout,clearTimer=clearTimeout,random=Math.random,deadlineMs=25000}={}){
  Object.assign(this,{onEvent,onState,load,setTimer,clearTimer,random,deadlineMs});this.generation=0;this.retry=0;this.wanted=false;this.connection=null;this.state={status:'idle',username:'',roomId:'',attempt:0,nextRetryAt:0,error:'',hasSigningKey:!!(process.env.SIGN_API_KEY||process.env.TIKTOK_SIGN_API_KEY)};
 }
 publish(values){Object.assign(this.state,values);this.onState({...this.state});}
 async connect(username,{autoReconnect=true}={}){
  username=cleanUniqueId(username);const generation=++this.generation;this.wanted=false;this.clearTimer(this.timer);this.timer=null;const conn=this.connection;this.connection=null;await this.dispose(conn);
  if(generation!==this.generation)return;this.wanted=true;this.username=username;this.autoReconnect=autoReconnect;this.retry=0;await this.attempt(generation);
 }
 async dispose(conn){if(!conn)return;try{await conn.disconnect();}catch{}}
 async attempt(generation){
  if(generation!==this.generation||!this.wanted)return;
  this.publish({status:'connecting',username:this.username,roomId:'',error:'',nextRetryAt:0,attempt:this.retry});let conn,timer,expired=false;
  try{
   const lib=await this.load();if(generation!==this.generation)return;
   const key=process.env.TIKTOK_SIGN_API_KEY||process.env.SIGN_API_KEY;
   conn=new lib.TikTokLiveConnection(this.username,{processInitialData:false,enableExtendedGiftInfo:false,...(key?{signApiKey:key}:{})});this.connection=conn;
   const current=()=>generation===this.generation&&this.connection===conn&&this.wanted;
   for(const [constant,kind] of [['CHAT','chat'],['GIFT','gift'],['MEMBER','member'],['LIKE','like'],['FOLLOW','follow'],['SHARE','share'],['ROOM_USER','roomUser']])if(lib.WebcastEvent[constant])conn.on(lib.WebcastEvent[constant],d=>{if(current())this.onEvent(kind,d,String(d?.common?.roomId||conn.roomId||this.username));});
   conn.on(lib.ControlEvent.ERROR,e=>{if(current())this.publish({error:safeError(e)});});
   conn.on(lib.ControlEvent.DISCONNECTED,()=>{if(current()){this.connection=null;this.schedule(generation,new Error('Mất kết nối TikTok.'));}});
   if(lib.WebcastEvent.STREAM_END)conn.on(lib.WebcastEvent.STREAM_END,()=>{if(current()){this.wanted=false;this.connection=null;this.clearTimer(this.timer);this.publish({status:'ended',nextRetryAt:0,error:'Phòng LIVE đã kết thúc.'});this.dispose(conn);}});
   const opening=Promise.resolve(conn.connect());
   // disconnect() during the HTTP handshake may precede the socket opening.
   // Race deadlines do not cancel that handshake: close its late result too.
   opening.then(()=>{if(expired)this.dispose(conn);},()=>{});
   const result=await Promise.race([opening,new Promise((_,reject)=>timer=this.setTimer(()=>{expired=true;reject(new Error('Kết nối quá thời gian chờ.'));},this.deadlineMs))]);
   if(!current()){await this.dispose(conn);return;}
   this.retry=0;this.publish({status:'connected',roomId:String(result?.roomId||''),attempt:0,nextRetryAt:0,error:''});
  }catch(e){if(generation===this.generation&&this.wanted){if(this.connection===conn)this.connection=null;await this.dispose(conn);this.schedule(generation,e);}}
  finally{this.clearTimer(timer);}
 }
 schedule(generation,error){
  if(generation!==this.generation||!this.wanted||this.timer)return;
  const message=safeError(error),fatal=/\b(401|403)\b|invalid.*api.*key|premium|unauthoriz/i.test(message);
  if(error?.constructor?.name==='UserOfflineError'||/requested user (?:isn't|is not) online/i.test(message)){
   this.wanted=false;this.publish({status:'offline',roomId:'',error:'Kênh chưa phát LIVE. Bắt đầu LIVE trên TikTok rồi bấm Kết nối TikTok.',nextRetryAt:0});return;
  }
  if(!this.autoReconnect||fatal){this.wanted=false;this.publish({status:'error',error:message,nextRetryAt:0});return;}
  const delay=Math.min(60000,2000*2**Math.min(this.retry++,5))+Math.floor(this.random()*700);
  this.publish({status:'reconnecting',error:message,attempt:this.retry,nextRetryAt:Date.now()+delay});
  this.timer=this.setTimer(()=>{this.timer=null;this.attempt(generation);},delay);this.timer?.unref?.();
 }
 async disconnect(publish=true){
  this.generation++;this.wanted=false;this.clearTimer(this.timer);this.timer=null;
  const conn=this.connection;this.connection=null;await this.dispose(conn);
  if(publish)this.publish({status:'idle',roomId:'',error:'',nextRetryAt:0,attempt:0});
 }
}
module.exports={TikTokSession};
