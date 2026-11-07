'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {welcomeMode}=require('../src/live-broadcast.js');
const {WebSocketServer}=require('ws'),{Store}=require('./store.cjs'),{Runtime}=require('./runtime.cjs'),{safeError,sanitizeSpokenName}=require('./tiktok-adapter.cjs');
function createApp({root=path.resolve(__dirname,'..'),directory=path.join(root,'runtime'),port=4173,runtime:providedRuntime,autoRun=false,openCapture=port=>require('../scripts/open-overlay.cjs').openOverlay(port)}={}){
 let runtime=providedRuntime;
 if(!runtime){const store=new Store(directory);store.acquire();try{runtime=new Runtime({store});}catch(e){store.close();throw e;}}
 let actualPort=port,closing=false,broadcastTimer,audioOwner=null,audioPlaybackSync=false,audioGiftPlaybackSync=false,activePlayback=null;
 const speechItems=new Map();
 const hostAllowed=value=>new Set([`127.0.0.1:${actualPort}`,`localhost:${actualPort}`,`[::1]:${actualPort}`]).has(String(value||'').toLowerCase());
 const originAllowed=value=>{try{const u=new URL(value);return u.protocol==='http:'&&hostAllowed(u.host)&&u.pathname==='/';}catch{return false;}};
 // GLTFLoader's ImageBitmapLoader fetches embedded PNGs through blob URLs.
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' blob: ws://127.0.0.1:* ws://localhost:*; img-src 'self' data: blob:; media-src 'self' data: blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'"};
 const respond=(res,status,body,type='text/plain; charset=utf-8')=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(body);};
 const server=http.createServer((req,res)=>{
  if(!hostAllowed(req.headers.host)){respond(res,421,'Host không hợp lệ');return;}
  if(!['GET','HEAD'].includes(req.method)){respond(res,405,'Method not allowed');return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{respond(res,400,'Bad URL');return;}
  if(pathname==='/health'){respond(res,200,JSON.stringify({app:'tuat-live',version:2,serverTime:Date.now(),storageError:runtime.fault,clients:wss.clients.size,tiktok:runtime.tiktok.state.status,presentation:[...wss.clients].filter(ws=>ws.presentation).map(ws=>({...ws.presentation,reportAge:Date.now()-ws.presentation.at}))}),'application/json');return;}
  const audio=/^\/audio\/([a-f0-9-]{36})\.(mp3|wav)$/.exec(pathname);
  if(audio){const bytes=runtime.speech.get(audio[1],audio[2]);if(!bytes){respond(res,404,'Audio hết hạn');return;}res.writeHead(200,{...headers,'Content-Type':audio[2]==='wav'?'audio/wav':'audio/mpeg','Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);return;}
  const file=({'/':'index.html','/index.html':'index.html','/overlay.html':'overlay.html'})[pathname];
  if(!file){respond(res,404,'Not found');return;}
  fs.stat(path.join(root,file),(err,stat)=>{if(err){respond(res,404,'Hãy chạy npm run build');return;}res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8','Content-Length':stat.size});if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(path.join(root,file));stream.on('error',()=>res.destroy());stream.pipe(res);});
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:1024*1024,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  let u;try{u=new URL(req.url,'http://localhost');}catch{socket.destroy();return;}
  if(!hostAllowed(req.headers.host)||!originAllowed(req.headers.origin)||u.pathname!=='/ws'){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 const send=(ws,message)=>{if(ws.readyState!==1)return;if(ws.bufferedAmount>2*1024*1024){ws.terminate();return;}ws.send(JSON.stringify(message));};
 const broadcast=message=>{const bytes=JSON.stringify(message);for(const ws of wss.clients){if(ws.readyState!==1)continue;if(ws.bufferedAmount>2*1024*1024){ws.terminate();continue;}ws.send(bytes);}};
 function chooseAudio(preferred){
  const ready=[...wss.clients].filter(ws=>ws.readyState===1&&ws.audioReady),version=Math.max(0,...ready.map(ws=>ws.syncVersion||0)),modern=version>=2?ready.filter(ws=>ws.syncVersion===version):[],compatible=modern.length?modern:ready,studio=compatible.filter(ws=>ws.studio),pool=studio.length?studio:compatible,old=audioOwner,oldSync=audioPlaybackSync,oldGiftSync=audioGiftPlaybackSync;
  // Keep one output that can drive both speech and camera; legacy pages cannot steal it.
  audioOwner=pool.includes(preferred)?preferred:pool.find(ws=>ws===audioOwner)||pool.find(ws=>ws.role==='overlay')||pool[0]||null;
  runtime.roundAudioReady=audioOwner?.syncVersion>=4;if(!runtime.roundAudioReady)runtime.releasePreparation();
  audioPlaybackSync=audioOwner?.playbackSync===true;audioGiftPlaybackSync=audioOwner?.giftPlaybackSync===true;
  if(old!==audioOwner||oldSync!==audioPlaybackSync||oldGiftSync!==audioGiftPlaybackSync){if(activePlayback){broadcast({type:'speech-playback',...activePlayback,phase:'end',completed:false,at:Date.now()});activePlayback=null;}broadcast({type:'audio-output',clientId:audioOwner?.clientId||null,playbackSync:audioPlaybackSync,giftPlaybackSync:audioGiftPlaybackSync});}
 }
 runtime.on('snapshot',()=>{if(!broadcastTimer)broadcastTimer=setTimeout(()=>{broadcastTimer=null;broadcast(runtime.snapshot());},80);});
 runtime.on('status',()=>broadcast({type:'status',status:runtime.status()}));
 runtime.on('speech',item=>{if(item.roundPhase){const g=runtime.document.game;if(g.phase!==item.roundPhase.phase||g.round!==item.roundPhase.round||item.roundPhase.sync&&!g.preparationVoice)return;broadcast(runtime.snapshot());}speechItems.set(item.id,{...item,started:false});for(const [id,value]of speechItems)if(speechItems.size>40||Date.now()-value.at>60000)speechItems.delete(id);broadcast({type:'speech',...item});});
 runtime.on('reset',()=>{speechItems.clear();if(activePlayback)broadcast({type:'speech-playback',...activePlayback,phase:'end',completed:false,at:Date.now()});activePlayback=null;broadcast(runtime.snapshot());});
 runtime.on('log',item=>{for(const ws of wss.clients)if(ws.role==='manager')send(ws,{type:'log',item});});
 wss.on('connection',(ws,req)=>{
  ws.role=new URL(req.url,'http://localhost').searchParams.get('role')==='manager'?'manager':'overlay';ws.alive=true;ws.tokens=100;ws.lastRefill=Date.now();ws.clientId=randomUUID();ws.audioReady=false;
  ws.on('error',()=>{});ws.on('pong',()=>ws.alive=true);ws.on('close',()=>chooseAudio());send(ws,{type:'welcome',clientId:ws.clientId,audioOwner:audioOwner?.clientId||null,playbackSync:audioPlaybackSync,giftPlaybackSync:audioGiftPlaybackSync});send(ws,runtime.snapshot());
  if(ws.role==='manager')send(ws,{type:'logs',items:runtime.logs});
  ws.on('message',async(buffer,isBinary)=>{
   // Audio readiness is an ephemeral output capability, not a game/control command.
   if(!isBinary){try{const a=JSON.parse(buffer);if(a.type==='presentation-health'){if(ws.role!=='overlay'||buffer.length>1024||Date.now()-(ws.presentation?.at||0)<750)return;const stats=a.stats||{},row={at:Date.now(),visible:stats.visible===true,audioOutput:stats.audioOutput===true};for(const key of ['sequence','snapshotAge','wireDelay','frameAge','fps','timerLag'])if(Number.isFinite(stats[key]))row[key]=Math.max(0,Math.min(key==='sequence'?1e12:key==='fps'?240:60000,stats[key]));ws.presentation=row;return;}if(a.type==='audio-ready'){ws.audioReady=a.ready===true;ws.studio=ws.role==='overlay'&&a.source==='studio';ws.syncVersion=[1,2,3,4,5].includes(a.playbackSync)?a.playbackSync:0;ws.playbackSync=ws.syncVersion>=1;ws.giftPlaybackSync=ws.syncVersion>=2;chooseAudio();return;}if(a.type==='audio-claim'){chooseAudio(ws);return;}
    if(a.type==='speech-playback'){
     if(ws!==audioOwner||!ws.audioReady)return;
     const item=speechItems.get(a.id);
     if(a.phase==='start'&&(item?.welcome||item?.presentation||item?.roundPhase)&&!item.started&&Date.now()-item.at<45000&&Number.isFinite(a.duration)&&a.duration>=.01&&a.duration<=35){
      if(activePlayback)broadcast({type:'speech-playback',...activePlayback,phase:'end',completed:false,at:Date.now()});
      item.started=true;if(item.roundPhase?.phase==='prepare')runtime.releasePreparation(item.roundPhase.round);activePlayback={id:item.id,welcome:item.welcome,presentation:item.presentation,welcomeMode:welcomeMode(runtime.document.game),duration:a.duration,startedAt:Date.now()};broadcast({type:'speech-playback',...activePlayback,phase:'start'});
     }else if(a.phase==='end'&&activePlayback?.id===a.id){broadcast({type:'speech-playback',...activePlayback,phase:'end',completed:a.completed===true,at:Date.now()});activePlayback=null;}
     return;
    }
   }catch{}}
   if(ws.role!=='manager'){send(ws,{type:'error',error:'Overlay chỉ nhận dữ liệu; dùng bảng quản lý để điều khiển.'});return;}
   const now=Date.now();ws.tokens=Math.min(100,ws.tokens+(now-ws.lastRefill)*.03);ws.lastRefill=now;
   if(ws.tokens<1){send(ws,{type:'error',error:'Thao tác quá nhanh. Đợi một giây rồi thử lại.'});return;}ws.tokens--;
   let m;try{if(isBinary)throw new Error('Chỉ nhận JSON.');m=JSON.parse(buffer);if(!m||typeof m!=='object'||typeof m.requestId!=='string'||m.requestId.length>128)throw new Error('Thiếu mã yêu cầu.');
    let result;
    if(m.type==='command')result=runtime.command(m.command);
    else if(m.type==='open-overlay')result=openCapture(actualPort);
    else if(m.type==='import-legacy')result=runtime.importLegacy(m.state);
    else if(m.type==='configure')result=runtime.configure(m.config);
    else if(m.type==='connect'){result={accepted:true};send(ws,{type:'ack',requestId:m.requestId,result});await runtime.connect(m.username);return;}
    else if(m.type==='disconnect'){await runtime.disconnect();result={disconnected:true};}
    else if(m.type==='speak-test'){if(m.text!==undefined&&(typeof m.text!=='string'||m.text.length>240))throw new Error('Câu nghe thử tối đa 240 ký tự.');const name=m.kind==='name'?sanitizeSpokenName(m.text||'Na',runtime.document.liveConfig.pronunciations):null,text=name?'Chào Tuất '+name+'.':m.text?.trim()||'Chào Tuất Na.';runtime.speech.enqueue(text,{voice:runtime.document.liveConfig.voice,priority:1,fallback:'Xin chào',pronunciations:runtime.document.liveConfig.pronunciations,protectedTexts:name?[name]:[]});result={queued:true};}
    else throw new Error('Loại yêu cầu không hợp lệ.');
    send(ws,{type:'ack',requestId:m.requestId,result});
   }catch(e){send(ws,{type:'error',requestId:typeof m?.requestId==='string'?m.requestId:undefined,error:safeError(e)});}
  });
 });
 const tick=setInterval(()=>{try{const g=runtime.document.game;if(autoRun&&g.config.autoNext&&runtime.wasRunningOnRestore){runtime.wasRunningOnRestore=false;if(g.paused)runtime.command({id:'auto-resume-'+randomUUID(),type:'pause'});}if(autoRun&&g.config.autoNext&&!g.paused&&g.phase==='ready')runtime.command({id:'auto-start-'+randomUUID(),type:'start'});else runtime.tick();}catch(e){runtime.log('Tạm dừng: '+safeError(e));}},250);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
 async function listen(){
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{actualPort=server.address().port;resolve();});});
  return{url:`http://127.0.0.1:${actualPort}`,port:actualPort};
 }
 async function close(){if(closing)return;closing=true;clearInterval(tick);clearInterval(heartbeat);clearTimeout(broadcastTimer);for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));await runtime.close();}
 return{runtime,server,wss,listen,close};
}
module.exports={createApp};

