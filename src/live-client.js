(function(){
 'use strict';
 const E=TuatEngine,$=id=>document.getElementById(id),role=document.body.dataset.role,preview=new URLSearchParams(location.search).has('preview');
 const NS='tuat-live-v3:',STATE=NS+'state',LEASE=NS+'leader',CMD=NS+'command:',instance=crypto.randomUUID?.()||Math.random().toString(36).slice(2);
 const remoteMode=['http:','https:'].includes(location.protocol)&&typeof TuatTransport!=='undefined'&&!new URLSearchParams(location.search).has('demo');
 let transport,serverStatus=null,serverConnected=false,serverAudioOwner=null,serverPlaybackSync=false,serverGiftPlaybackSync=false,lastLiveConfig='',serverOffset=0,liveLogs=[],speechQueue=[],speechBusy=false,speechCurrent=null,spokenScene=null;
 let clockSamples=[],snapshotReceivedAt=0,snapshotSentAt=0,snapshotSequence=0;
 function syncServerClock(serverTime){const now=Date.now();if(!Number.isFinite(serverTime))return;clockSamples=clockSamples.filter(sample=>now-sample.at<30000);clockSamples.push({at:now,offset:serverTime-now});serverOffset=Math.max(...clockSamples.map(sample=>sample.offset));snapshotReceivedAt=now;snapshotSentAt=serverTime;}
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let local=false,storageError=false;
 if(role==='manager')for(const link of document.querySelectorAll('[data-open-overlay]'))link.addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  if(remoteMode&&transport?.connected){event.preventDefault();transport.request('open-overlay').then(()=>showToast('Đã mở sân dọc riêng.')).catch(error=>showToast(error.message));return;}
  const height=Math.max(320,(window.screen?.availHeight||1080)-80),width=Math.round(height*9/16),left=Math.max(0,Math.round(((window.screen?.availWidth||1920)-width)/2));
  const overlayURL=new URL(link.href,location.href);overlayURL.searchParams.set('capture','1');const popup=window.open(overlayURL.href,'tuat-overlay-916',`popup=yes,width=${width},height=${height},left=${left},top=0,resizable=no,scrollbars=no`);
  if(popup){event.preventDefault();popup.focus();}else{event.preventDefault();showToast('Cho phép cửa sổ bật lên hoặc mở Mo-San-Doc.bat trong thư mục dự án.');}
 });
 const memory=new Map();
 function get(k){try{return local?memory.get(k)||null:localStorage.getItem(k);}catch{local=true;return memory.get(k)||null;}}
 function set(k,v){try{if(local)memory.set(k,v);else localStorage.setItem(k,v);return true;}catch{storageError=true;showToast('Bộ nhớ đầy hoặc không khả dụng. Xuất bản sao trong quản lý.');return false;}}
 function remove(k){try{local?memory.delete(k):localStorage.removeItem(k);}catch{}}
 function parse(k){try{return JSON.parse(get(k)||'null');}catch{return null;}}
 const legacyBackup=parse(STATE);
 let state=legacyBackup;if(!state||state.version!==3||!Array.isArray(state.people)||!state.config)state=E.create();
 E.normalizePeople(state);
 let channel;try{channel=new BroadcastChannel(NS+'bus');}catch{}
 let lastWrite=0,lastLease=0,lastRevision=-1,lastPeople='',lastHistory='',lastGifts='',lastEventLog='',lastLeaders='',seenEvents=new Set(state.events.map(e=>e.id)),toastTimer,settingsLoaded=false;
 const celebrated=new Set(state.result?[state.result.id]:[]),honorSpoken=new Set();let audioBootstrapped=false;
 const barkCursor={};
 const barkAudio=new TuatBarks(),ambience=typeof TuatAmbience!=='undefined'?new TuatAmbience():null;
 const audioSession=preview?null:new TuatAudioSession({audio:barkAudio,read:get,write:set,id:instance,prefix:NS,onChange:renderAudioButton,coordinate:!remoteMode,defaultOn:true});
 const startAt=Date.now(),inspection=new URLSearchParams(location.search).get('model');
 document.body.classList.toggle('model-inspector',!!inspection);
 document.body.classList.toggle('capture-window',new URLSearchParams(location.search).has('capture'));
 if(role==='overlay'&&!preview&&!inspection&&new URLSearchParams(location.search).has('capture')){
  addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey)event.preventDefault();},{passive:false});
  addEventListener('keydown',event=>{if(event.key==='F11'||(event.ctrlKey||event.metaKey)&&['+','-','=','0','Add','Subtract'].includes(event.key))event.preventDefault();});
  for(const name of ['gesturestart','gesturechange'])addEventListener(name,event=>event.preventDefault(),{passive:false});
  if(window.opener&&window.resizeTo){let resizeTimer;const pin=()=>{const screen=window.screen,chromeW=Math.max(0,window.outerWidth-innerWidth),chromeH=Math.max(0,window.outerHeight-innerHeight),height=Math.max(320,screen.availHeight-chromeH),width=Math.round(height*9/16),x=(screen.availLeft||0)+Math.round((screen.availWidth-width-chromeW)/2),y=screen.availTop||0;if(Math.abs(innerWidth-width)>1||Math.abs(innerHeight-height)>1)window.resizeTo(width+chromeW,height+chromeH);window.moveTo(x,y);};addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(pin,100);});pin();}
 }
 function showToast(text){const t=$('toast');if(!t)return;t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200);}
 async function bark(force=false,voice,actor,team,form,extra={}){
  if(!force&&!hasAudioOutput())return false;
  try{return await barkAudio.play({voice,actor,team,form,volume:state.config.volume,preview:force,...extra});}catch(error){console.error('[Tuất audio '+(TuatBarks.REVISION||'legacy')+']',error);const surface=$('live-audio')||$('broadcast');if(surface)surface.dataset.audioError=String(error.stack||error);throw error;}
 }
 function hasAudioOutput(){return state.config.volume>0&&!!audioSession?.canOutput()&&(!remoteMode||serverConnected&&serverAudioOwner===transport?.clientId);}
 function updateWelcomeSync(){const config=serverStatus?.config;state.welcomeSpeechEnabled=!!(config?.voiceEnabled&&config?.readJoins);state.giftSpeechEnabled=!!(config?.voiceEnabled&&config?.readGifts);state.giftSpeechMinCoins=config?.minSpeakCoins??1;}
 function cameraSpeech(message){
  const scene=message.presentation||(message.welcome?{kind:'welcome',event:message.welcome}:null);
  if(message.phase==='start'&&scene&&Number.isFinite(message.duration)){message={...message,welcomeMode:message.welcomeMode||(scene.kind==='welcome'?TuatBroadcast.welcomeMode(state):'camera')};spokenScene={id:message.id,scene,welcomeMode:message.welcomeMode,until:message.startedAt+message.duration*1000};}
  else if(message.phase==='end'&&spokenScene?.id===message.id)spokenScene=null;
  renderWelcome(Date.now()+serverOffset);
  try{canvas?.speechPlayback?.(message);}catch(error){console.error('Không mở được cảnh chào:',error);}
 }
 async function prepareInteractionAudio(){
  if(preview||state.config.volume===0||!audioSession?.requested||hasAudioOutput()||remoteMode&&serverAudioOwner&&serverAudioOwner!==transport?.clientId&&serverGiftPlaybackSync)return;
  if(await audioSession.enable()){transport?.reportAudio(true);transport?.claimAudio();}
  else if(role==='manager')showToast(audioSession.error||'Chạm vào sân để mở âm thanh.');
 }
 function renderAudioButton(){
  if(!audioSession)return;
  const button=$('live-audio'),surface=button||$('broadcast'),a=audioSession.info(),enabled=state.config.volume>0;
  const output=enabled&&a.output&&(!remoteMode||serverConnected&&serverAudioOwner===transport?.clientId);
  if(surface){surface.dataset.audioState=enabled?a.state:'muted';surface.dataset.audioOutput=String(output);}
  if(!output)ambience?.stop();
  if(!button)return;
  button.setAttribute('aria-pressed',String(output));
  button.textContent=!enabled?'♫ Bật tiếng sân':state.config.volume===0?'♫ Âm lượng 0% · chỉnh Setting':output||remoteMode&&serverAudioOwner?'♫ Tiếng sân đang bật':a.state==='loading'?'♫ Đang mở tiếng…':a.state==='error'?'♫ Thử bật tiếng lại':'♫ Chạm để bật tiếng';
  button.title=enabled?'Bấm để tắt tiếng chung ở quản lý và overlay':a.error||'Bật tiếng sân và nhạc nền';
 }
 function bindLiveAudio(){
  if(preview)return;
  const button=$('live-audio');if(button)button.onclick=async()=>{
   if(state.config.volume>0&&(hasAudioOutput()||remoteMode&&serverAudioOwner)){set(NS+'volume-before-mute',String(state.config.volume));send('settings',{values:{volume:0}});return;}
   // Unlock synchronously in the click; the shared setting reaches OBS as well.
   const unlocking=audioSession.enable({manual:true});
   send('settings',{values:{volume:Number(get(NS+'volume-before-mute'))||65}});
   if(await unlocking){transport?.reportAudio(true);renderAudioEvents(Date.now()+serverOffset);}
   else showToast(audioSession.error||'Chạm lại để bật tiếng.');
  };
  // User activation must reach AudioContext.resume() in this same event handler.
  const recover=e=>{if(e.target?.closest?.('#live-audio'))return;if(state.config.volume>0&&audioSession.requested&&audioSession.state!=='running'&&audioSession.state!=='loading')audioSession.enable().then(ready=>{if(ready)renderAudioEvents(Date.now()+serverOffset);});};
  addEventListener('pointerdown',recover);addEventListener('keydown',recover);
  addEventListener('pageshow',recover);addEventListener('focus',recover);
  addEventListener('pagehide',()=>audioSession.release());
  audioSession.onChange();if(audioSession.requested)audioSession.enable();
 }
 let lastSoundEnabled=true,lastAudioReady=false;
 function renderAudioEvents(now){
  audioSession?.sync();
  const enabled=state.config.volume>0;
  if(!enabled&&lastSoundEnabled){barkAudio.stop();speechQueue=[];ambience?.stop();}lastSoundEnabled=enabled;
  const ready=enabled&&!!audioSession?.output&&!preview,connectedReady=ready&&(!remoteMode||serverConnected),claim=connectedReady&&!lastAudioReady&&role==='overlay';lastAudioReady=connectedReady;
  transport?.reportAudio(ready);if(claim)transport?.claimAudio();
  ambience?.sync({audio:barkAudio,enabled:hasAudioOutput()&&state.config.musicEnabled!==false,volume:state.config.musicVolume??30,masterVolume:state.config.volume,phase:state.phase});const soundSurface=$('live-audio')||$('broadcast');if(soundSurface){soundSurface.dataset.musicState=ambience?.info().playing?'playing':'off';soundSurface.dataset.musicStyle=ambience?.info().style||'';soundSurface.dataset.musicGain=String(ambience?.info().gain||0);soundSurface.dataset.musicVolume=String(ambience?.info().volume??state.config.musicVolume??30);soundSurface.dataset.audioRevision=TuatBarks.REVISION||'legacy';soundSurface.dataset.barkActive=String(barkAudio.active||0);soundSurface.dataset.barkPlayed=String(barkAudio.played||0);soundSurface.dataset.barkDuration=String(barkAudio.last?.duration||0);soundSurface.dataset.barkLoops=String([...barkAudio.sources||[]].filter(s=>s.immediate&&s.loop).length);}
  const signaled=new Set([...state.people,...state.fighters].filter(u=>u.barkSignal).map(u=>u.id));
  for(const e of E.barkCues(state,barkCursor,now))if(e.at>=startAt-100)bark(false,undefined,e.actor,e.team,e.soundForm,{immediate:e.source==='like'||e.source==='comment',count:e.count,priority:state.phase==='battle'&&state.fighters.some(f=>f.id===e.actor)?2:0}).catch(err=>showToast(err.message));
  for(const e of state.events)if(!seenEvents.has(e.id)){
   seenEvents.add(e.id);
   if((e.kind==='skill'||e.kind==='bark'&&!signaled.has(e.actor))&&e.at>=startAt-100&&now-e.at<2000){
    const actor=state.fighters.find(f=>f.id===e.actor);
    bark(false,undefined,e.actor,e.team||actor?.team,e.soundForm||e.actorForm||actor?.form,{immediate:e.source==='like'||e.source==='comment',count:e.count||1}).catch(err=>showToast(err.message));
   }
   if(e.kind==='gift'&&e.at>=startAt-100&&now-e.at<2000&&hasAudioOutput())barkAudio.giftCue?.(e.gift,state.config.volume,{team:e.team,applied:!['heal','revive'].includes(e.gift)||!!e.targets?.length})?.catch(err=>showToast(err.message));
  }
  const result=state.result;if(result&&state.phase==='break'&&!celebrated.has(result.id)){celebrated.add(result.id);if(now-result.at>=0&&now-result.at<2000&&hasAudioOutput())barkAudio.celebrate?.(state.config.volume).catch(e=>showToast(e.message));if(celebrated.size>100)celebrated.delete(celebrated.values().next().value);}
  if(seenEvents.size>150)seenEvents=new Set(state.events.map(e=>e.id));
 }
 function persist(){if(parse(LEASE)?.id!==instance)return false;state.updatedAt=Date.now();state.writer=instance;const saved=set(STATE,JSON.stringify(state));if(saved){lastWrite=Date.now();channel?.postMessage({type:'state',revision:state.revision});}return saved;}
 function send(type,values={}){
  const command={...values,type,id:values.id||`${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`,at:Date.now()};
  if(JSON.stringify(command).length>10000)return false;
  if(remoteMode){if(!transport?.connected){showToast('Máy chủ chưa kết nối. Thao tác chưa được gửi.');return false;}transport.request('command',{command}).catch(e=>showToast(e.message));return command.id;}
  set(CMD+command.id,JSON.stringify(command));channel?.postMessage({type:'command'});pump();return command.id;
 }
 function leader(now){
  if(remoteMode)return false;
  if(inspection)return false;
  let lease=parse(LEASE);
  if(now-lastLease>=800){
   if(!lease||lease.until<now||lease.id===instance||(role==='manager'&&lease.role!=='manager')){set(LEASE,JSON.stringify({id:instance,role,until:now+10000}));}
   lastLease=now;lease=parse(LEASE);
  }
  return lease?.id===instance;
 }
 function acceptState(){if(remoteMode)return;const remote=parse(STATE);if(remote?.version===3&&remote.writer!==instance&&remote.updatedAt>=(state.updatedAt||0))state=E.normalizePeople(remote);}
 function commands(){const out=[];try{const keys=local?[...memory.keys()]:Object.keys(localStorage);for(const k of keys)if(k.startsWith(CMD)){const c=parse(k);if(c)out.push({k,c});else remove(k);}}catch{}return out.sort((a,b)=>a.c.at-b.c.at).slice(0,200);}
 function pump(){
  const now=Date.now()+serverOffset,owns=leader(now);
  if(remoteMode){render(now,false);return;}
  if(owns){acceptState();let dirty=false;const batch=commands();for(const {k,c} of batch){try{E.dispatch(state,c,now);dirty=true;}catch(e){console.error(e);showToast('Sự kiện chưa hợp lệ; đã bỏ qua.');dirty=true;}}
   dirty=E.tick(state,now)||dirty;
   if(dirty||!get(STATE)||(state.phase!=='ready'&&now-lastWrite>=1000)){if(persist())for(const {k} of batch)remove(k);}
  }else acceptState();
  render(now,owns);
 }
 channel?.addEventListener('message',()=>{acceptState();render(Date.now(),parse(LEASE)?.id===instance);});
 window.addEventListener('storage',e=>{if(e.key===STATE){acceptState();render(Date.now(),false);}});
 function releaseAuthority(){if(parse(LEASE)?.id===instance){remove(LEASE);channel?.postMessage({type:'release'});}}
 window.addEventListener('pagehide',releaseAuthority);window.addEventListener('beforeunload',releaseAuthority);
 function remaining(now){return state.phase==='ready'?state.config.roundSeconds:state.paused||state.preparationVoice?state.remaining:Math.max(0,(state.phaseEnd-now)/1000);}
 function clock(seconds){seconds=Math.ceil(seconds);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
 function time(at){return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(at);}
 function teamName(t,record){return t?(record?.teams?.[t]||state.config[t==='left'?'leftName':'rightName']):'Chưa xếp đội';}
 function phaseName(){return state.paused?'TẠM DỪNG':state.phase==='prepare'?'CHUẨN BỊ · ĐÃ GHÉP ĐỘI':state.phase==='battle'?'ĐANG GIAO TRANH':state.phase==='break'?'NGHỈ · ĐÓN TUẤT MỚI':'CHỜ MỞ SÀN';}
 function download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function seed(){
  const names=['Minh Anh','Bé Na','Hải Nam','Cô Bông','Mèo Mập','Bắp Rang','Linh Chi','Anh Khoa','Bé Gạo','Mộc Miên','Khoai Tây','Cá Mập','Thanh Hà','Duy Khang','Bánh Bao','Trà Sữa'];
  names.forEach((name,i)=>send('join',{userId:'demo-'+i,name,team:i%2?'right':'left'}));showToast('Đã chào 16 tuất demo. Bấm mở trận để bốc đội.');
 }
 function selectedPerson(){const p=state.people.find(p=>p.id===$('event-person').value);if(!p){showToast('Thêm người xem trước khi thử sự kiện.');return null;}return p;}
 function populateSettings(){
  const form=$('settings-form');if(!form)return;
  for(const [k,v] of Object.entries(state.config)){const el=form.elements[k];if(el){if(el.type==='checkbox')el.checked=v;else el.value=v;}}
  form.elements.musicEnabled.checked=state.config.musicEnabled!==false;form.elements.musicVolume.value=state.config.musicVolume??30;
  form.elements.roundMinutes.value=state.config.roundSeconds/60;form.elements.breakMinutes.value=state.config.breakSeconds/60;form.elements.attackSeconds.value=state.config.attackInterval/1000;
  form.elements.cameraEnabled.checked=state.config.cameraEnabled!==false;form.elements.cameraStrength.value=state.config.cameraStrength||1;
  document.querySelectorAll('[data-camera-preview]').forEach(button=>button.onclick=()=>{$('scene-preview').contentWindow.postMessage({type:'tuat:shot',kind:button.dataset.cameraPreview,strength:Number(form.elements.cameraStrength.value)},location.origin==='null'?'*':location.origin);});
  $('gift-settings').innerHTML=E.GIFT_DEFS.map(g=>`<label>${g.icon} ${g.displayName||g.name} (xu)<input name="gift-${g.id}" type="number" min="1" max="100000" value="${state.config.gifts[g.id]}"></label>`).join('');
  $('volume-output').textContent=state.config.volume+'%';setupBarkVoices();setupModelSettings();settingsLoaded=true;
 }
 function setupBarkVoices(){
  $('bark-voices').innerHTML=barkAudio.profiles.map((p,i)=>`<button type="button" data-bark-voice="${p.id}"><span>♫</span><strong>${i+1}. ${p.label}</strong><small>${p.count} mẫu · bản thu thật</small></button>`).join('');
  $('bark-voices').onclick=async e=>{const b=e.target.closest('[data-bark-voice]');if(!b)return;try{await bark(true,b.dataset.barkVoice);$('bark-preview-status').textContent='Đang nghe: '+barkAudio.profiles.find(p=>p.id===b.dataset.barkVoice).label;document.querySelectorAll('[data-bark-voice]').forEach(el=>el.classList.toggle('selected',el===b));}catch(err){showToast(err.message);}};
  $('creature-voices').innerHTML=barkAudio.creatureProfiles.map(p=>`<button type="button" data-creature-voice="${p.id}"><span>${p.id==='tiger'?'🐅':'🐉'}</span><strong>${p.label}</strong><small>${p.count} mẫu · ${p.kind==='recording'?'bản thu hổ thật':'hiệu ứng thiết kế'}</small></button>`).join('');
  $('creature-voices').onclick=async e=>{const b=e.target.closest('[data-creature-voice]');if(!b)return;try{await bark(true,b.dataset.creatureVoice);$('bark-preview-status').textContent='Đang nghe: '+barkAudio.creatureProfiles.find(p=>p.id===b.dataset.creatureVoice).label;document.querySelectorAll('[data-creature-voice]').forEach(el=>el.classList.toggle('selected',el===b));}catch(err){showToast(err.message);}};
 }
 const modelNames={shiba:'Shiba vàng',husky:'Husky',pug:'Pug mặt xệ',becgie:'Becgie',corgi:'Corgi',tiger:'Hổ vằn',dragon:'Rồng Trung Hoa'};
 let selectedModel='shiba';
 function viewerMessage(message){$('model-viewer')?.contentWindow?.postMessage(message,location.origin==='null'?'*':location.origin);}
 function modelVisibility(visible){const viewer=$('model-viewer');if(!viewer)return;if(visible&&!viewer.getAttribute('src'))viewer.src='overlay.html?preview=1&model='+selectedModel+(!remoteMode?'&demo=1':'');viewerMessage({type:'tuat:visibility',active:visible});}
 function setupModelSettings(){
  $('model-tabs').innerHTML=Object.entries(modelNames).map(([id,name])=>`<button type="button" data-model="${id}" class="${id===selectedModel?'selected':''}">${name}</button>`).join('');
  for(const t of ['left','right']){const lineup=state.config[t==='left'?'modelsLeft':'modelsRight']||E.defaults.modelsLeft;$('lineup-'+t).innerHTML=lineup.map((chosen,i)=>`<label>Mẫu bot ${i+1}<select name="model-${t}-${i}">${Object.entries(modelNames).filter(([id])=>!['tiger','dragon'].includes(id)).map(([id,name])=>`<option value="${id}" ${chosen===id?'selected':''}>${name}</option>`).join('')}</select></label>`).join('');}
  $('model-tabs').onclick=e=>{const b=e.target.closest('[data-model]');if(!b)return;selectedModel=b.dataset.model;$('model-name').textContent=modelNames[selectedModel];document.querySelectorAll('[data-model]').forEach(el=>el.classList.toggle('selected',el===b));viewerMessage({type:'tuat:model',model:selectedModel});};
  $('model-viewer').onload=()=>viewerMessage({type:'tuat:model',model:selectedModel});
  document.querySelectorAll('[data-model-clip]').forEach(b=>b.onclick=()=>{viewerMessage({type:'tuat:clip',clip:b.dataset.modelClip});if(b.dataset.modelClip==='attack')bark(true,undefined,undefined,undefined,selectedModel).catch(e=>showToast(e.message));});
  $('model-scale-output').textContent=Math.round((state.config.modelScale||1)*100)+'%';$('settings-form').elements.modelScale.oninput=e=>$('model-scale-output').textContent=Math.round(Number(e.target.value)*100)+'%';
 }
 function setupLiveConnection(){
  if(!remoteMode){if($('scene-preview')&&get(NS+'preview-paused')!=='yes')$('scene-preview').src='overlay.html?preview=1&demo=1';document.querySelectorAll('a[href="overlay.html"]').forEach(a=>a.href='overlay.html?demo=1');}
  if(!remoteMode){if($('tiktok-status')){$('tiktok-status').textContent='Demo offline · chạy npm start để nhận TikTok thật';for(const id of ['tiktok-connect','tiktok-disconnect','tts-test','import-legacy','add-gift-rule','save-gift-rules'])$(id).disabled=true;for(const id of ['tiktok-connect-form','live-settings-form'])$(id).onsubmit=e=>{e.preventDefault();showToast('Chạy npm start rồi mở địa chỉ localhost để kết nối TikTok.');};}return;}
  transport=new TuatTransport({role,source:new URLSearchParams(location.search).has('studio')?'studio':'normal',
   onSnapshot:message=>{if(message.state?.version!==3)return;if(message.state.resetId&&message.state.resetId!==state.resetId){barkAudio.stop();ambience?.stop();speechQueue=[];speechCurrent=null;seenEvents=new Set(message.state.events.map(e=>e.id));celebrated.clear();honorSpoken.clear();lastRevision=-1;lastPeople='';lastHistory='';lastEventLog='';lastLeaders='';}if(!audioBootstrapped){audioBootstrapped=true;if(message.state.result)celebrated.add(message.state.result.id);}state=message.state;syncServerClock(message.serverTime);snapshotSequence=message.sequence||0;serverStatus=message.status;updateWelcomeSync();state.broadcast=TuatBroadcast.fromStatus(serverStatus,state.config);renderLiveStatus();render(Date.now()+serverOffset,false);},
   onStatus:status=>{serverStatus=status;updateWelcomeSync();state.broadcast=TuatBroadcast.fromStatus(status,state.config);renderLiveStatus();},
   onConnection:connected=>{serverConnected=connected;if(!connected){clockSamples=[];lastAudioReady=false;barkAudio.stop();speechQueue=[];}renderAudioButton();renderLiveStatus();},
   onAudio:(owner,playbackSync,giftPlaybackSync)=>{const lost=serverAudioOwner&&serverAudioOwner!==owner;serverAudioOwner=owner;serverPlaybackSync=playbackSync===true;serverGiftPlaybackSync=giftPlaybackSync===true;updateWelcomeSync();if(lost){barkAudio.stop();speechQueue=[];}renderAudioEvents(Date.now()+serverOffset);renderAudioButton();renderLiveStatus();},
   onSpeech:item=>{if(!validRoundSpeech(item)||!hasAudioOutput()||Date.now()+serverOffset-item.at>15000)return;if(item.honorId){if(honorSpoken.has(item.honorId))return;honorSpoken.add(item.honorId);if(honorSpoken.size>100)honorSpoken.delete(honorSpoken.values().next().value);}if(item.priority>=3)speechQueue=speechQueue.filter(p=>(p.priority||0)>0);if(item.priority>=3||speechCurrent&&item.priority>speechCurrent.priority)barkAudio.stopSpeech?.();if(speechQueue.length>=6){const index=speechQueue.findIndex(p=>(p.priority||0)<(item.priority||0));if(index<0)return;speechQueue.splice(index,1);}speechQueue.push(item);speechQueue.sort((a,b)=>(b.priority||0)-(a.priority||0));pumpSpeech();},
   onSpeechPlayback:message=>cameraSpeech({...message,startedAt:message.startedAt-serverOffset}),
   onLog:item=>{liveLogs.push(item);liveLogs=liveLogs.slice(-80);if($('live-logs'))$('live-logs').textContent=liveLogs.slice(-12).map(l=>time(l.at)+' · '+l.text).join('\n');},
   onError:showToast
  });
  if(role==='manager'){
   const request=(type,values)=>transport.request(type,values).catch(e=>showToast(e.message));
   $('tiktok-connect-form').onsubmit=e=>{e.preventDefault();request('connect',{username:$('tiktok-username').value});};
   $('tiktok-disconnect').onclick=()=>request('disconnect');
   $('live-settings-form').onsubmit=e=>{e.preventDefault();const f=e.target.elements,config={};for(const k of ['autoReconnect','joinOnEnter','voiceEnabled','readJoins','readGifts','readWinner','readRounds','readSocial'])config[k]=f[k].checked;config.voice=f.voice.value;config.minSpeakCoins=Number(f.minSpeakCoins.value);try{config.pronunciations=(f.pronunciations.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map((line,i)=>{const at=line.indexOf('=');if(at<1||!line.slice(at+1).trim())throw new Error('Dòng '+(i+1)+' cần dạng: từ = cách đọc');return{word:line.slice(0,at).trim(),spoken:line.slice(at+1).trim()};});}catch(error){showToast(error.message);return;}request('configure',{config});};
   $('tts-test').onclick=async()=>{if(!await audioSession.enable({manual:true})){showToast(audioSession.error||'Chạm Bật tiếng sân rồi thử lại.');return;}await request('command',{command:{id:crypto.randomUUID(),type:'settings',values:{volume:state.config.volume||Number(get(NS+'volume-before-mute'))||65}}});state.config.volume=state.config.volume||Number(get(NS+'volume-before-mute'))||65;transport.reportAudio(true);transport.claimAudio();await request('speak-test',{text:$('speech-test-text').value,kind:$('speech-test-kind').value});};
   $('import-legacy').onclick=()=>{if(!legacyBackup){showToast('Không tìm thấy demo cũ trong trình duyệt này.');return;}request('import-legacy',{state:legacyBackup});};
   $('add-gift-rule').onclick=()=>{const rows=readGiftRules();rows.push({giftId:'',name:'Quà mới',aliases:[],skill:'rose',unitCoins:1});renderGiftRules(rows);};
   $('save-gift-rules').onclick=()=>request('configure',{config:{giftRules:readGiftRules()}});
   $('gift-rules').onclick=e=>{const b=e.target.closest('[data-remove-rule]');if(!b)return;const rows=readGiftRules();rows.splice(Number(b.dataset.removeRule),1);renderGiftRules(rows);};
   $('gift-rules').onchange=e=>{const row=e.target.closest('[data-gift-rule]');if(!row)return;if(e.target.matches('[data-field="catalogGift"]')){const g=TuatGiftArt.find(e.target.value);if(g){row.querySelector('[data-field="giftId"]').value=g.id;row.querySelector('[data-field="name"]').value=g.name;row.querySelector('[data-field="aliases"]').value=g.name;}}const value={giftId:row.querySelector('[data-field="giftId"]').value,aliases:row.querySelector('[data-field="aliases"]').value.split(',')};row.querySelector('img').src=TuatGiftArt.forRule(value,serverStatus?.catalog);};
   $('observed-gifts').onclick=e=>{const b=e.target.closest('[data-map-gift]');if(!b)return;const item=serverStatus?.catalog.find(g=>g.key===b.dataset.mapGift);if(!item)return;const rows=readGiftRules();if(rows.some(r=>r.giftId&&r.giftId===item.giftId)){showToast('Gift ID này đã có trong bảng quy tắc.');return;}rows.push({giftId:item.giftId,name:item.name,aliases:[item.name],skill:'rose',unitCoins:item.unitCoins});renderGiftRules(rows);showToast('Đã thêm dòng. Chọn skill rồi Lưu quy tắc quà.');};
  }
  transport.connect();addEventListener('pagehide',()=>transport.close());
 }
 function readGiftRules(){return [...document.querySelectorAll('[data-gift-rule]')].map(row=>({giftId:row.querySelector('[data-field="giftId"]').value.trim(),name:row.querySelector('[data-field="name"]').value.trim(),aliases:row.querySelector('[data-field="aliases"]').value.split(',').map(v=>v.trim()).filter(Boolean),skill:row.querySelector('[data-field="skill"]').value,unitCoins:Number(row.querySelector('[data-field="unitCoins"]').value)}));}
 function renderGiftRules(rows){
  if(!$('gift-rules'))return;
  $('gift-rules').innerHTML=rows.map((r,i)=>`<div class="gift-rule" data-gift-rule><img class="gift-rule-art" src="${TuatGiftArt.forRule(r,serverStatus?.catalog)}" alt="Ảnh quà TikTok thật theo Gift ID"><label>Chọn ảnh quà TikTok thật<select data-field="catalogGift"><option value="">Chọn quà đã nhúng…</option>${TuatGiftArt.items.map(g=>`<option value="${g.id}" ${r.giftId===g.id?'selected':''}>${esc(g.name)} · ID ${g.id}</option>`).join('')}</select></label><label>Gift ID<input data-field="giftId" inputmode="numeric" value="${esc(r.giftId)}" placeholder="Ưu tiên ID thật"></label><label>Tên hiển thị<input data-field="name" value="${esc(r.name)}"></label><label>Tên khớp, cách nhau dấu phẩy<input data-field="aliases" value="${esc(r.aliases.join(', '))}"></label><label>Skill<select data-field="skill">${E.GIFT_DEFS.map(g=>`<option value="${g.id}" ${r.skill===g.id?'selected':''}>${g.icon} ${g.displayName||g.name}</option>`).join('')}</select></label><label>Xu / quà khi TikTok thiếu giá<input data-field="unitCoins" type="number" min="0" max="1000000" value="${Number(r.unitCoins)||0}"></label><button type="button" data-remove-rule="${i}" aria-label="Bỏ quy tắc ${i+1}">×</button></div>`).join('');
 }
 function renderLiveStatus(){
  if(role!=='manager')return;
  const s=serverStatus,t=s?.tiktok,labels={idle:'Chưa nối TikTok',offline:'Kênh chưa phát LIVE',connecting:'Đang kết nối',connected:'Đang nhận LIVE',reconnecting:'Đang kết nối lại',ended:'LIVE đã kết thúc',error:'Chưa kết nối được'};
  $('tiktok-status').textContent=!serverConnected?'Máy chủ chưa kết nối':`${labels[t?.status]||'Chờ trạng thái'}${t?.username?' · @'+t.username:''}`;
  $('tiktok-status').dataset.status=t?.status||'idle';$('tiktok-error').textContent=t?.error||s?.storage?.error||'';
  $('tiktok-connect').disabled=!serverConnected||t?.status==='connecting';$('tiktok-disconnect').disabled=!serverConnected||['idle','offline','ended'].includes(t?.status);
  if(!s)return;
  $('import-legacy').disabled=!legacyBackup||state.people.length>0||state.round>0;
  $('live-metrics').textContent=`${s.viewers||0} người đang xem · ${s.metrics.chat} bình luận · ${s.metrics.like} tim · ${s.metrics.follow} theo dõi · ${s.metrics.share} chia sẻ · ${s.metrics.gift} quà / ${s.metrics.coins} xu${s.pendingGifts?' · '+s.pendingGifts+' quà chờ tiếp tục trận':''}`;
  $('tts-status').textContent=!s.config.voiceEnabled?'Giọng đọc đang tắt':s.speech.error?'Giọng đọc: '+s.speech.error:`Giọng đọc: ${s.speech.provider==='windows'?'Windows'+(s.speech.fallback?' dự phòng':'')+' ('+s.speech.voice+')':s.speech.provider==='edge'?'Edge':'sẵn sàng'} · chào ${s.config.readJoins?'bật':'tắt'} · quà ${s.config.readGifts?'bật':'tắt'} · ${s.speech.busy?'đang tạo tiếng · ':''}${s.speech.pending} câu chờ${serverAudioOwner?'':' · Chạm Bật tiếng sân để nghe'}`;
  if(s.config.voiceEnabled&&serverAudioOwner&&!serverGiftPlaybackSync)$('tts-status').textContent+=' · Bật tiếng tại cửa sổ này để khớp hình và giọng.';
  const key=JSON.stringify(s.config);if(key!==lastLiveConfig){lastLiveConfig=key;$('tiktok-username').value=s.config.username;const f=$('live-settings-form').elements;for(const k of ['autoReconnect','joinOnEnter','voiceEnabled','readJoins','readGifts','readWinner','readRounds','readSocial'])f[k].checked=s.config[k];f.voice.value=s.config.voice;f.minSpeakCoins.value=s.config.minSpeakCoins;f.pronunciations.value=(s.config.pronunciations||[]).map(r=>r.word+' = '+r.spoken).join('\n');renderGiftRules(s.config.giftRules);}
  $('observed-gifts').innerHTML=s.catalog.slice().reverse().map(g=>`<div class="observed-gift"><strong>${esc(g.name)}</strong><span>ID ${esc(g.giftId||'?')} · ${g.unitCoins||'?'} xu · ${g.mapped?'đã có quy tắc':'tiếp sức điểm đội của người gửi'}</span><button type="button" data-map-gift="${esc(g.key)}">Gán skill</button></div>`).join('')||'<p class="small-note">Quà nhận từ LIVE sẽ xuất hiện ở đây, kèm Gift ID thật để gán skill.</p>';
 }
 function validRoundSpeech(item){return !item.roundPhase||item.roundPhase.round===state.round&&item.roundPhase.phase===state.phase&&(!item.roundPhase.sync||!!state.preparationVoice);}
 async function pumpSpeech(){
  if(speechBusy)return;speechBusy=true;
  try{while(speechQueue.length&&hasAudioOutput()){const item=speechQueue.shift();if(!validRoundSpeech(item)||Date.now()+serverOffset-item.at>30000)continue;const status=$('tts-playback-status'),text=item.spokenText||item.text;speechCurrent=item;try{if(status)status.textContent='Đang đọc: '+text;const played=await barkAudio.speak(item.url,state.config.volume,{duckBarks:item.presentation?.kind==='gift',onStart:duration=>{if(!item.welcome&&!item.presentation&&!item.roundPhase)return;transport?.reportSpeechPlayback(item.id,'start',duration);cameraSpeech({phase:'start',id:item.id,welcome:item.welcome,presentation:item.presentation,duration,startedAt:Date.now()});},onEnd:completed=>{if(!item.welcome&&!item.presentation&&!item.roundPhase)return;transport?.reportSpeechPlayback(item.id,'end',undefined,completed);cameraSpeech({phase:'end',id:item.id,completed,at:Date.now()});}});if(!played&&item.priority>0&&item.priority<3&&hasAudioOutput()&&speechQueue.some(p=>p.priority>item.priority)){speechQueue.push(item);speechQueue.sort((a,b)=>(b.priority||0)-(a.priority||0));}if(status)status.textContent=played?'Đã đọc: '+text:'Đã dừng giọng đọc.';}catch(e){if(status)status.textContent='Chưa phát được: '+e.message;showToast('Giọng đọc: '+e.message);}finally{if(speechCurrent===item)speechCurrent=null;}}}
  finally{speechBusy=false;if(!hasAudioOutput())speechQueue=[];}
 }
 function bindManager(){
  const frame=$('scene-preview'),previewButton=$('preview-toggle'),pausedPreview=$('preview-paused');const updatePreview=()=>{const paused=get(NS+'preview-paused')==='yes',src=paused?'about:blank':'overlay.html?preview=1'+(remoteMode?'':'&demo=1');if(frame.getAttribute('src')!==src)frame.src=src;frame.hidden=paused;pausedPreview.hidden=!paused;previewButton.textContent=paused?'Bật xem trước':'Tắt xem trước để giảm tải';previewButton.setAttribute('aria-pressed',String(paused));};previewButton.onclick=()=>{set(NS+'preview-paused',get(NS+'preview-paused')==='yes'?'no':'yes');updatePreview();};updatePreview();
  $('studio-url').value=(remoteMode?location.origin:'http://127.0.0.1:4173')+'/overlay.html?studio=1';$('copy-studio-url').onclick=async()=>{try{await navigator.clipboard.writeText($('studio-url').value);showToast('Đã sao chép URL nguồn LIVE Studio.');}catch{$('studio-url').select();showToast('Chọn và sao chép URL nguồn LIVE Studio.');}};
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>{const yes=x===b;x.classList.toggle('active',yes);x.setAttribute('aria-selected',String(yes));});document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!=='tab-'+b.dataset.tab);modelVisibility(b.dataset.tab==='settings');lastRevision=-1;render(Date.now()+serverOffset,false);});
  $('start-round').onclick=()=>send('start');$('pause-round').onclick=()=>send('pause');$('next-round').onclick=()=>send('next');$('seed-demo').onclick=seed;
  $('join-form').onsubmit=async e=>{e.preventDefault();const name=$('join-name').value.trim();if(!name)return;await prepareInteractionAudio();send('join',{userId:'user-'+(crypto.randomUUID?.()||Date.now()),name,announce:true});$('join-name').value='';showToast('Đã gửi lời chào tuất mới.');};
  $('send-comment').onclick=()=>{const p=selectedPerson();if(p)send('comment',{userId:p.id,name:p.name,team:p.team,text:$('comment-text').value});};
  $('event-person').onchange=()=>{const p=selectedPerson();if(p?.team)$('gift-team').value=p.team;};
  $('gift-buttons').onclick=async e=>{const b=e.target.closest('[data-gift]');if(!b)return;const p=selectedPerson();if(!p)return;const values={userId:p.id,name:p.name,team:$('gift-team').value,gift:b.dataset.gift,count:Number($('gift-count').value),announce:true};await prepareInteractionAudio();send('gift',values);};
  $('people-table').onclick=e=>{const b=e.target.closest('button[data-action]');if(!b)return;const p=state.people.find(p=>p.id===b.dataset.id);if(!p)return;
   if(b.dataset.action==='leave')send('leave',{userId:p.id});else if(b.dataset.action==='pin')send('pin',{userId:p.id,value:!p.pinned});else if(b.dataset.action==='move')send('move',{userId:p.id,team:p.team==='left'?'right':'left'});else if(b.dataset.action==='remove')send('remove',{userId:p.id});};
  $('settings-form').onsubmit=e=>{e.preventDefault();const f=e.target,v={};for(const k of ['title','leftName','rightName'])v[k]=f.elements[k].value;
   for(const k of ['maxHp','baseDamage','damagePerCoin','damageCap','healHp','revivePercent','volume','musicVolume','modelScale','cameraStrength'])v[k]=Number(f.elements[k].value);
   v.roundSeconds=Number(f.elements.roundMinutes.value)*60;v.breakSeconds=Number(f.elements.breakMinutes.value)*60;v.attackInterval=Number(f.elements.attackSeconds.value)*1000;
   for(const k of ['autoNext','earlyWin','cameraEnabled','musicEnabled'])v[k]=f.elements[k].checked;v.gifts={};for(const g of E.GIFT_DEFS)v.gifts[g.id]=Number(f.elements['gift-'+g.id].value);
   v.modelsLeft=Array.from({length:5},(_,i)=>f.elements['model-left-'+i].value);v.modelsRight=Array.from({length:5},(_,i)=>f.elements['model-right-'+i].value);send('settings',{values:v});$('settings-feedback').textContent='Đã lưu & đồng bộ overlay';showToast('Đã lưu setting.');};
  $('settings-form').elements.volume.oninput=e=>$('volume-output').textContent=e.target.value+'%';
  $('test-bark').onclick=()=>bark(true).catch(e=>showToast(e.message));$('test-growl').onclick=async()=>{try{const played=await bark(true,'growl');$('bark-preview-status').textContent=played?'Đang nghe: gầm gừ thật':'Đợi một nhịp rồi thử lại.';}catch(e){showToast(e.message);}};
  $('export-state').onclick=()=>download('tuat-live-backup.json',state);$('export-history').onclick=()=>download('tuat-live-chien-tich.json',state.history);
  $('reset-open').onclick=()=>{$('reset-panel').hidden=false;$('reset-confirm').value='';$('reset-status').textContent=`Sẽ xóa ${state.people.length} hồ sơ tuất, ${state.history.length} lịch sử trận, điểm và quà đang chờ. Giữ setting, kênh và quy tắc quà. Tự lưu bản sao trước khi reset.`;};
  $('reset-cancel').onclick=()=>{$('reset-panel').hidden=true;};
  $('reset-submit').onclick=async()=>{if($('reset-confirm').value.trim()!=='RESET'){$('reset-status').textContent='Nhập đúng RESET để xác nhận xóa dữ liệu.';return;}const button=$('reset-submit');button.disabled=true;try{if(remoteMode){const result=await transport.request('command',{command:{type:'reset',id:crypto.randomUUID(),confirm:'RESET',expectedCreatedAt:state.createdAt}});showToast('Đã reset. Bản sao: runtime/'+result.backup);}else{download('tuat-before-reset-'+Date.now()+'.json',state);send('reset',{confirm:'RESET',expectedCreatedAt:state.createdAt});barkAudio.stop();speechQueue=[];showToast('Đã reset dữ liệu và tải bản sao.');}$('reset-panel').hidden=true;}catch(e){$('reset-status').textContent=e.message;}finally{button.disabled=false;}};
  populateSettings();
 }
 function renderManager(now,owns){
  $('sync-status').textContent=remoteMode?(serverConnected?'Máy chủ đang điều phối':'Mất kết nối máy chủ · đang thử lại'):local?'Demo riêng · cần HTTP để kết nối TikTok':owns?'Demo · quản lý điều phối':'Demo · đồng bộ cùng phiên';
  $('phase-label').textContent=phaseName();$('control-clock').textContent=clock(remaining(now));$('round-number').textContent='TRẬN '+String(state.round).padStart(2,'0');$('control-count').textContent=state.people.filter(p=>!p.hiddenAt).length+' tuất trên sân';
  $('left-summary').textContent=state.config.leftName;$('right-summary').textContent=state.config.rightName;
  $('left-stat').textContent=`${E.points(state,'left')} điểm · ${E.total(state,'left')} HP · +${state.boost.left}/sủa`;$('right-stat').textContent=`${E.points(state,'right')} điểm · ${E.total(state,'right')} HP · +${state.boost.right}/sủa`;
  $('start-round').disabled=state.phase!=='ready';$('start-round').textContent=state.round?'▶ Mở trận':'▶ Mở trận đầu';$('pause-round').disabled=state.phase==='ready';$('pause-round').textContent=state.paused?'▶ Tiếp tục':'Ⅱ Tạm dừng';$('next-round').disabled=state.phase==='prepare';$('next-round').textContent=state.phase==='prepare'?'Đang giới thiệu đội hình':state.phase==='battle'?'Kết thúc trận':state.phase==='break'?'Bỏ qua nghỉ →':'Bốc đội & bắt đầu';
  if(state.revision===lastRevision)return;lastRevision=state.revision;
  if(!$('tab-live').hidden){
  const giftKey=JSON.stringify([state.config.gifts,state.config.healHp]);if(giftKey!==lastGifts){lastGifts=giftKey;$('gift-buttons').innerHTML=E.GIFT_DEFS.map(g=>`<button class="gift-action" data-gift="${g.id}"><img src="${TuatGiftArt.demoUri(g.id)}" alt="Minh họa ${g.displayName||g.name}"><b>${g.displayName||g.name}</b><small>${state.config.gifts[g.id]} xu · DEMO</small><em>${g.description}</em></button>`).join('');}
  const active=new Set(['prepare','battle'].includes(state.phase)?state.fighters.map(f=>f.id):[]);
  const peopleKey=JSON.stringify(state.people.map(p=>[p.id,p.team,p.pinned,p.coins,p.lastPlayed,p.priorityCoins,p.hiddenAt,p.leftAt,p.liveRank,p.liveContribution,p.breed]))+state.phase;
  if(peopleKey!==lastPeople){lastPeople=peopleKey;const value=$('event-person').value;
   $('event-person').innerHTML=state.people.length?state.people.map(p=>`<option value="${esc(p.id)}">${esc(E.tuat(p.name))} · ${esc(p.hiddenAt?'Đã rời sân':teamName(p.team))}</option>`).join(''):'<option value="">Chưa có người xem</option>';
   if(state.people.some(p=>p.id===value))$('event-person').value=value;
   $('people-count').textContent=state.people.filter(p=>!p.hiddenAt).length;
   $('people-table').innerHTML=state.people.length?E.ranked(state,Date.now()+serverOffset).map(p=>{const fighting=active.has(p.id);return `<tr><td><strong>${esc(E.tuat(p.name))}</strong><small>${modelNames[E.modelFor(p)]||'Chó'} · ${p.wins} thắng · ${p.rounds} trận</small></td><td>${p.team?`<i class="${p.team==='left'?'red':'blue'}-dot"></i>`:''} ${esc(teamName(p.team))}<small><span class="status-chip ${fighting?'active':''}">${p.hiddenAt?'Đã rời sân':p.leftAt!==undefined?(fighting?'Rời LIVE · giữ đến hết trận':'Rời LIVE · giữ 3 phút'):fighting?'Trên sàn':'Ghế chờ'}</span></small></td><td>${p.coins}<small>${p.liveContribution?`${p.liveContribution} xu trên LIVE`:'Đóng góp đã lưu'}</small></td><td>${p.liveRank?`Hạng #${p.liveRank}`:'Chưa có hạng'}<small>Theo LIVE / xu</small></td><td class="table-actions"><button data-action="leave" data-id="${esc(p.id)}" title="Xác nhận đã rời LIVE; đang đấu thì giữ đến hết trận" ${p.hiddenAt||p.leftAt!==undefined?'disabled':''}>Rời LIVE</button> <button data-action="remove" data-id="${esc(p.id)}" title="Rời hàng chờ" ${fighting?'disabled':''}>×</button></td></tr>`;}).join(''):'<tr><td colspan="5" class="empty">Chưa có tuất nào. Thêm người hoặc dùng danh sách demo.</td></tr>';
  }
  const logKey=state.events.slice(-30).map(e=>e.id).join('|');if(logKey!==lastEventLog){lastEventLog=logKey;$('event-log').innerHTML=state.events.slice(-30).reverse().map(e=>`<div class="log-row ${e.kind}"><time>${time(e.at)}</time><span>${esc(e.text)}</span></div>`).join('')||'<div class="empty">Đợi lời chào đầu tiên của cả xóm.</div>';}
  }
  $('history-count').textContent=state.history.length;
  if(!$('tab-history').hidden){
  const historyKey=state.history.map(r=>r.id).join('|');
  if(historyKey!==lastHistory){lastHistory=historyKey;$('history-count').textContent=state.history.length;
   $('history-list').innerHTML=state.history.map(r=>`<article class="history-card"><div><span>TRẬN ${String(r.round).padStart(2,'0')} · ${new Date(r.at).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} ${time(r.at)}</span><b>${r.winner==='draw'?'HÒA':esc(teamName(r.winner,r))+' THẮNG'}</b></div><h3>♛ ${esc(E.tuat(r.king?.name||'Ẩn danh'))}</h3><p>${r.king?.score||0} điểm Tuất Vương · ${r.king?.damage||0} sát thương · ${r.leftPoints!==undefined?`${r.leftPoints} / ${r.rightPoints} điểm`:`${r.leftHp} / ${r.rightHp} HP (luật cũ)`}</p></article>`).join('')||'<div class="panel empty">Trận đầu tiên chưa kết thúc. Tuất Vương sẽ được vinh danh ở đây.</div>';
  }
   const leaders=E.winLeaders(state,10),leaderKey=JSON.stringify(leaders.map(p=>[p.id,p.name,p.wins,p.rounds,p.rank]));if(leaderKey!==lastLeaders){lastLeaders=leaderKey;$('leaderboard').innerHTML=leaders.map((p,i)=>`<div class="leader-card"><span>${p.rank===1?'♛':'#'+p.rank}</span><strong>${esc(E.tuat(p.name))}</strong><small>${p.wins} thắng / ${p.rounds} trận · ${Math.round(p.wins/Math.max(1,p.rounds)*100)}%</small></div>`).join('')||'<div class="empty">Chưa có chiến tích</div>';
  }
  }
 }
 let lastHonorId='';
 let lastPreparation='';
 function renderPreparation(now){
  const panel=$('round-preparation');if(!panel)return;const view=TuatBroadcast.preparation(state,now);panel.hidden=!view;if(!view){delete $('broadcast').dataset.preparing;return;}$('broadcast').dataset.preparing='true';
  $('preparation-seconds').textContent=String(view.seconds).padStart(2,'0');$('preparation-label').textContent=view.paused?'ĐANG TẠM DỪNG':'TRẬN BẮT ĐẦU SAU';$('preparation-round').textContent='ĐỘI HÌNH TRẬN '+String(view.round).padStart(2,'0');
  const key=JSON.stringify([view.round,state.config.leftName,state.config.rightName,view.left.map(f=>[f.id,f.name,f.form]),view.right.map(f=>[f.id,f.name,f.form])]);if(key===lastPreparation)return;lastPreparation=key;
  for(const side of ['left','right']){$('preparation-'+side+'-name').textContent=teamName(side);$('preparation-'+side).innerHTML=view[side].map((f,i)=>`<li><span>${i+1}</span><div><b>${esc(E.tuat(f.name))}</b>${f.form==='dog'?'':`<small>${f.form==='dragon'?'RỒNG':'HỔ'} VĨNH VIỄN</small>`}</div></li>`).join('');}
 }
 function renderHonor(now){
  const view=TuatBroadcast.honor(state,now),panel=$('round-honor'),celebration=$('honor-celebration');if(!panel)return;panel.hidden=!view;if(celebration)celebration.hidden=!view;
  if(!view){delete $('broadcast').dataset.honor;return;}$('broadcast').dataset.honor='true';
  if(lastHonorId!==view.id){lastHonorId=view.id;if(celebration){let seed=[...view.id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),age=Math.max(0,(now-view.at)/1000),colors=['#f7cf67','#fff0b8','#df735f','#76bcc4','#9dbd78'];celebration.innerHTML=Array.from({length:80},(_,i)=>`<i style="left:${(random()*100).toFixed(2)}%;--fall:${(3+random()*3).toFixed(2)}s;--delay:${(-age-random()*5).toFixed(2)}s;--drift:${Math.round((random()-.5)*430)}px;--spin:${Math.round(random()*1440-720)}deg;background:${colors[i%colors.length]}"></i>`).join('');}$('honor-round').textContent='TRẬN '+String(view.round).padStart(2,'0')+' · KHÉP LẠI';$('honor-king').textContent=E.tuat(view.king?.name||'Cả xóm');$('honor-winner').textContent=view.winner==='draw'?'HAI XÓM HÒA NHAU':teamName(view.winner,view)+' CHIẾN THẮNG';$('honor-points').textContent=Math.round(view.king?.score||0).toLocaleString('vi-VN');$('honor-ranking').innerHTML=view.top.map((p,i)=>`<div><span>${i+1}</span><b>${esc(p.placeholder?p.name:E.tuat(p.name))}</b><strong>${Math.round(p.points||0).toLocaleString('vi-VN')} điểm</strong></div>`).join('');$('honor-match-points').textContent=`${view.teams.left} ${view.leftPoints||0} · ${view.rightPoints||0} ${view.teams.right}`;}
  $('honor-countdown').textContent='VINH DANH CÒN '+String(view.seconds).padStart(2,'0')+'s · CHUẨN BỊ TRẬN MỚI';
 }
 let canvas,overlayLastConfig='',overlayLastPeople='',overlayLastResult='';
 function fit(){if(inspection){Object.assign($('broadcast').style,{width:innerWidth+'px',height:innerHeight+'px',left:'0',top:'0',transform:'none'});}else{const scale=Math.min(innerWidth/1080,innerHeight/1920);$('broadcast').style.transform=`translate(-50%,-50%) scale(${scale})`;}canvas?.resize();}
 function renderWelcome(now){
  const banner=$('welcome');if(!banner)return;
  if(spokenScene&&Date.now()>=spokenScene.until)spokenScene=null;
  const scene=spokenScene?.scene,person=scene?state.people.find(p=>p.id===scene.event.personId):null;
  banner.classList.toggle('crowd-welcome',!!person&&scene.kind==='welcome'&&spokenScene.welcomeMode==='banner');
  if(person){banner.textContent=scene.kind==='gift'?scene.event.text||'Cảm ơn '+E.tuat(person.name)+' tặng quà!':E.tuat(person.name)+' đến rồi!';banner.classList.add('visible');return;}
  const recent=state.events.slice().reverse().find(e=>['join','gift','win','follow','share'].includes(e.kind)&&!(e.kind==='join'&&state.welcomeSpeechEnabled)&&!(e.kind==='gift'&&state.giftSpeechEnabled&&e.coins>=state.giftSpeechMinCoins));
  const show=recent&&now-recent.at>=0&&now-recent.at<6500;banner.classList.toggle('visible',!!show);if(show&&recent.kind==='join')banner.classList.toggle('crowd-welcome',TuatBroadcast.welcomeMode(state)==='banner');banner.textContent=show?recent.text:'';
 }
 function renderOverlay(now,owns){
  canvas?.update(state);if(inspection)return;renderPreparation(now);renderHonor(now);
  $('overlay-title').textContent=state.config.title;$('overlay-left-name').textContent=state.config.leftName;$('overlay-right-name').textContent=state.config.rightName;
  $('overlay-phase').textContent=phaseName();$('overlay-clock').textContent=clock(remaining(now));$('overlay-round').textContent=String(state.round||1);
  $('overlay-left-hp').textContent=E.total(state,'left');$('overlay-right-hp').textContent=E.total(state,'right');$('waiting-count').textContent=E.waiting(state).length;
  $('overlay-sync').textContent=remoteMode?(serverConnected?'Đồng bộ máy chủ':'Đang kết nối lại máy chủ'):local?'Phiên riêng':owns?'Overlay điều phối':'Đồng bộ quản lý';$('king-name').textContent=state.result?E.tuat(state.result.king?.name):'';
  renderWelcome(now);
 }
 function render(now,owns){if(role==='manager')renderManager(now,owns);else renderOverlay(now,owns);renderAudioEvents(now);if(storageError){const b=$('sync-status')||$('overlay-sync');if(b){b.classList.add('offline-error');b.textContent='Lưu trữ không khả dụng';}}}
 if(role==='manager')bindManager();else{fit();addEventListener('resize',fit);canvas=new TuatCanvas($('fight-canvas'));document.querySelectorAll('[data-support]').forEach(b=>{b.disabled=preview;b.onclick=()=>{send('gift',{userId:'fan-'+b.dataset.support,name:'Khán Giả '+(b.dataset.support==='left'?'Trái':'Phải'),team:b.dataset.support,gift:b.dataset.gift,count:1});showToast('Đã gửi quà mô phỏng cho đội '+(b.dataset.support==='left'?'Trái':'Phải'));};});}
 bindLiveAudio();
 setupLiveConnection();
 window.DogBattleDemo={send,getState:()=>JSON.parse(JSON.stringify(state)),audioInfo:()=>({enabled:hasAudioOutput(),session:audioSession?.info()||{state:'preview'},...barkAudio.info()}),connectionInfo:()=>({serverConnected,audioOwner:serverAudioOwner,pending:transport?.pending.size||0}),renderInfo:()=>canvas?.info?.()||null,instance,role,mode:remoteMode?'server':'offline'};
 pump();setInterval(pump,250);
 if(remoteMode&&role==='overlay'&&!preview&&(new URLSearchParams(location.search).has('capture')||new URLSearchParams(location.search).has('studio'))){let lastReport=Date.now();setInterval(()=>{const now=Date.now(),surface=$('broadcast');transport?.reportPresentation({sequence:snapshotSequence,snapshotAge:snapshotReceivedAt?now-snapshotReceivedAt:60000,wireDelay:snapshotSentAt?Math.max(0,snapshotReceivedAt+serverOffset-snapshotSentAt):0,frameAge:canvas?.lastPresentedAt?now-canvas.lastPresentedAt:60000,fps:Number(surface?.dataset.renderFps)||0,timerLag:Math.max(0,now-lastReport-1000),visible:document.visibilityState!=='hidden',audioOutput:surface?.dataset.audioOutput==='true'});lastReport=now;},1000);}
})();




