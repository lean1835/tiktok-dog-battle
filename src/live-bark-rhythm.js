(function(root){
 'use strict';
 function planBark(previous,at,count=1){
  at=Number.isFinite(at)?Math.max(0,at):0;count=Number.isFinite(count)?Math.max(1,Math.min(100000,count)):1;
  const continuing=!!previous&&Number.isFinite(previous.at)&&previous.until>at&&at>=previous.at,gap=continuing?at-previous.at:0;
  const hold=Math.min(3500,Math.max(count>1?1600:600,count>1?count*220:0,continuing?1200:0,continuing?gap*1.5+200:0));
  return{at,until:at+hold,continuing,count};
 }
 const api={planBark};root.TuatBarkRhythm=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
