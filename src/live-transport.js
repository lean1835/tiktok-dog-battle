(function(root){
 'use strict';
 class TuatTransport{
  constructor({role,source='normal',onSnapshot=()=>{},onStatus=()=>{},onSpeech=()=>{},onSpeechPlayback=()=>{},onConnection=()=>{},onAudio=()=>{},onLog=()=>{},onError=()=>{}}){
   Object.assign(this,{role,source,onSnapshot,onStatus,onSpeech,onSpeechPlayback,onConnection,onAudio,onLog,onError});this.pending=new Map();this.connected=false;this.stopped=false;this.attempt=0;this.clientId=null;this.audioReady=false;
  }
  connect(){
   if(this.stopped)return;const protocol=location.protocol==='https:'?'wss:':'ws:';
   const socket=new root.WebSocket(`${protocol}//${location.host}/ws?role=${this.role}`);this.socket=socket;
   socket.onopen=()=>{if(this.socket!==socket)return;this.connected=true;this.attempt=0;this.onConnection(true);for(const request of this.pending.values())socket.send(JSON.stringify(request.message));this.sendAudio();};
   socket.onmessage=e=>{if(this.socket!==socket)return;let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.type==='welcome'){this.clientId=m.clientId;this.onAudio(m.audioOwner,m.playbackSync===true,m.giftPlaybackSync===true);}
    else if(m.type==='snapshot')this.onSnapshot(m);
    else if(m.type==='status')this.onStatus(m.status);
    else if(m.type==='speech')this.onSpeech(m);
    else if(m.type==='speech-playback')this.onSpeechPlayback(m);
    else if(m.type==='audio-output')this.onAudio(m.clientId,m.playbackSync===true,m.giftPlaybackSync===true);
    else if(m.type==='logs')m.items.forEach(item=>this.onLog(item));
    else if(m.type==='log')this.onLog(m.item);
    else if(m.type==='ack'||m.type==='error'){
     const request=this.pending.get(m.requestId);if(request){clearTimeout(request.timer);this.pending.delete(m.requestId);m.type==='ack'?request.resolve(m.result):request.reject(new Error(m.error));}
     else if(m.type==='error')this.onError(m.error);
    }
   };
   socket.onerror=()=>{};
   socket.onclose=()=>{if(this.socket!==socket)return;this.connected=false;this.clientId=null;this.onAudio(null);this.onConnection(false);if(!this.stopped)this.timer=setTimeout(()=>this.connect(),Math.min(10000,500*2**Math.min(5,this.attempt++)));};
  }
  request(type,values={}){
   if(!this.connected)return Promise.reject(new Error('Mất kết nối máy chủ. Đợi kết nối lại rồi thử.'));
   if(this.role!=='manager')return Promise.reject(new Error('Dùng màn quản lý để điều khiển.'));
   if(this.pending.size>=100)return Promise.reject(new Error('Đang có nhiều thao tác chờ xác nhận.'));
   const requestId=crypto.randomUUID(),message={...values,type,requestId};
   return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error('Chưa nhận xác nhận. Kiểm tra kết quả trên màn hình trước khi thử lại.'));},30000);this.pending.set(requestId,{message,resolve,reject,timer});this.socket.send(JSON.stringify(message));});
  }
  reportAudio(ready){if(this.audioReady===ready)return;this.audioReady=ready;this.sendAudio();}
  sendAudio(){if(this.connected)this.socket.send(JSON.stringify({type:'audio-ready',ready:this.audioReady,playbackSync:5,source:this.source}));}
  claimAudio(){if(this.connected&&this.audioReady)this.socket.send(JSON.stringify({type:'audio-claim'}));}
  reportSpeechPlayback(id,phase,duration,completed){if(this.connected&&this.audioReady)this.socket.send(JSON.stringify({type:'speech-playback',id,phase,duration,completed}));}
  reportPresentation(stats){if(this.connected&&this.role==='overlay')this.socket.send(JSON.stringify({type:'presentation-health',stats}));}
  close(){this.stopped=true;clearTimeout(this.timer);this.socket?.close();for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Đã đóng kết nối.'));}this.pending.clear();}
 }
 root.TuatTransport=TuatTransport;
})(window);
