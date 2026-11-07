(function(root){
 'use strict';
 // One audible top-level page per origin. Preview iframes never create a session.
 class TuatAudioSession{
  constructor({audio,read,write,id,prefix='tuat-live-v3:',now=()=>Date.now(),onChange=()=>{},coordinate=true,defaultOn=false}){
   Object.assign(this,{audio,read,write,id,now,onChange,coordinate});
   this.preferenceKey=prefix+'audio-enabled';this.ownerKey=prefix+'audio-output';
   if(defaultOn)write(this.preferenceKey,'on');this.requested=defaultOn||read(this.preferenceKey)!=='off';this.state=this.requested?'needs-gesture':'muted';this.epoch=0;this.error='';this.output=false;
   audio.onStateChange=()=>this.sync();
  }
  owner(){try{return JSON.parse(this.read(this.ownerKey)||'null');}catch{return null;}}
  release(){if(this.owner()?.id===this.id)this.write(this.ownerKey,JSON.stringify({id:this.id,until:0}));this.output=false;}
  async enable({manual=false}={}){
   const epoch=++this.epoch;this.requested=true;if(manual)this.write(this.preferenceKey,'on');
   this.state='loading';this.error='';this.onChange();
   try{
    await this.audio.unlock();if(epoch!==this.epoch||!this.requested)return false;
    if(manual&&this.coordinate)this.write(this.ownerKey,JSON.stringify({id:this.id,until:this.now()+5000}));
    this.state='running';this.sync();return true;
   }catch(e){if(epoch!==this.epoch)return false;this.state=e.code==='AUDIO_GESTURE'?'needs-gesture':'error';this.error=e.message;this.onChange();return false;}
  }
  disable({persist=true}={}){++this.epoch;this.requested=false;this.state='muted';if(persist)this.write(this.preferenceKey,'off');this.release();this.audio.stop();this.onChange();}
  sync(){
   const preference=this.read(this.preferenceKey);
   if(preference==='off'&&this.requested){this.disable({persist:false});return false;}
   if(preference==='on'&&!this.requested){this.requested=true;this.state='needs-gesture';}
   let owns=false;
   if(this.requested&&this.audio.ctx?.state==='running'){
    this.state='running';const owner=this.owner(),now=this.now();
    owns=!this.coordinate||!owner||owner.until<=now||owner.id===this.id;
    if(this.coordinate&&owns&&(!owner||owner.id!==this.id||owner.until-now<2000))this.write(this.ownerKey,JSON.stringify({id:this.id,until:now+5000}));
   }else if(this.requested&&this.state==='running')this.state='needs-gesture';
   if(this.output&&!owns)this.audio.stop();this.output=owns;this.onChange();return owns;
  }
  canOutput(){return this.sync();}
  info(){return{requested:this.requested,state:this.state,output:this.output,error:this.error};}
 }
 root.TuatAudioSession=TuatAudioSession;
})(window);
