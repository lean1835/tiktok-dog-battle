(function(root){
 'use strict';
 function compose(sampleRate=32000){
  const beat=60/76,seconds=32*beat,data=new Float32Array(Math.ceil(seconds*sampleRate)),chords=[[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,55]],melody=[72,0,76,0,74,0,72,0,69,0,72,0,71,0,0,0,69,0,72,0,76,0,72,0,71,0,74,0,72,0,0,0];
  const add=(note,at,length,amp,pad=false)=>{const frequency=440*2**((note-69)/12),start=Math.floor(at*sampleRate),n=Math.floor(length*sampleRate);for(let j=0;j<n&&start+j<data.length;j++){const t=j/sampleRate,attack=Math.min(1,t/(pad?.4:.035)),release=Math.min(1,(length-t)/(pad?.5:.24)),envelope=attack*release*(pad?1:Math.exp(-t*2.1)),phase=2*Math.PI*frequency*t;data[start+j]+=amp*envelope*(Math.sin(phase)+.12*Math.sin(phase*2)+.025*Math.sin(phase*3));}};
  for(let bar=0;bar<8;bar++){const chord=chords[bar%4],at=bar*4*beat;for(const note of chord)add(note,at,4*beat,.024,true);add(chord[0]-12,at,1.8*beat,.1);for(let k=0;k<4;k++)add(chord[k]+12,at+k*beat,1.4*beat,.055);for(let k=0;k<4;k++){const note=melody[bar*4+k];if(note)add(note,at+k*beat,1.5*beat,.095);}}
  // A stable listening level keeps the gentle bed audible under busy LIVE voices.
  let energy=0,peak=0;for(let i=0;i<data.length;i++){data[i]*=Math.min(1,i/(sampleRate*.1),(data.length-1-i)/(sampleRate*.1));energy+=data[i]*data[i];peak=Math.max(peak,Math.abs(data[i]));}const gain=Math.min(.12/Math.sqrt(energy/data.length||1),.8/(peak||1));for(let i=0;i<data.length;i++)data[i]*=gain;return{data,sampleRate,seconds};
 }

 class TuatAmbience{
  constructor(){this.buffers=new WeakMap();this.source=null;this.gain=null;}
  sync({audio,enabled,volume=30,masterVolume=65,phase}={}){
   const ctx=audio?.ctx;if(!enabled||!ctx||ctx.state!=='running'){this.stop();return;}
   if(!ctx.createBuffer)return;
   if(!this.source||this.ctx!==ctx){this.stop();this.ctx=ctx;let buffer=this.buffers.get(ctx);if(!buffer){const pcm=compose();buffer=ctx.createBuffer(1,pcm.data.length,pcm.sampleRate);buffer.getChannelData(0).set(pcm.data);this.buffers.set(ctx,buffer);}this.source=ctx.createBufferSource();this.source.buffer=buffer;this.source.loop=true;this.gain=ctx.createGain();this.gain.gain.value=0;this.source.connect(this.gain);this.gain.connect(audio.limiter||ctx.destination);this.source.start();}
   this.level=Math.min(100,Math.max(0,volume));if(phase==='break'&&this.level>0)this.level=60;
   const duck=audio.ducking?.38:audio.active>0?.78:1,target=this.level/100*Math.max(0,Math.min(100,masterVolume))/100*.85*duck;this.gain.gain.setTargetAtTime(target,ctx.currentTime,audio.ducking?.1:.45);
  }
  stop(){if(this.source){try{this.source.stop();}catch{}this.source.disconnect();this.source=null;this.gain.disconnect();this.gain=null;}}
  info(){return{playing:!!this.source,gain:this.gain?.gain.value||0,volume:this.level||0,style:'Piano êm dịu · sáng tác gốc',loop:true};}
 }
 TuatAmbience.compose=compose;root.TuatAmbience=TuatAmbience;
})(window);
