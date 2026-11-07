/* Original 2.5D canvas art, embedded in overlay.html. */
(function(root){
 const palette={shiba:['#e5a24c','#fff0cd'],husky:['#788a91','#f4f0e5'],pug:['#d3b387','#f2dcb6'],becgie:['#b77a43','#e1ba79'],corgi:['#e49c48','#fff1d6']};
 class TuatCanvas {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.state=null;this.frame=0;this.dpr=Math.min(devicePixelRatio||1,2);new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);}
  resize(){const r=this.canvas.getBoundingClientRect();this.canvas.width=Math.max(1,r.width*this.dpr);this.canvas.height=Math.max(1,r.height*this.dpr);}
  update(s){this.state=s;}
  ellipse(x,y,rx,ry,fill){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  path(points,fill,stroke,width=2){const c=this.ctx;c.beginPath();points(c);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}}
  grad(x,y,a,b){const g=this.ctx.createLinearGradient(x,y,x+25,y+90);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
  dog(f,t,bark){
   const c=this.ctx,tiger=f.form==='tiger',pair=tiger?['#f0ab4f','#fff0d2']:palette[f.breed]||palette.shiba,body=pair[0],cream=pair[1],step=bark?Math.sin(t*20)*5:Math.sin(t*2+f.slot)*2;
   // Far legs and tail, shaded behind the body.
   c.save();c.translate(-45,1);c.rotate(Math.sin(t*4)*.18);
   this.path(p=>{p.moveTo(0,5);p.bezierCurveTo(-46,-17,-36,-55,-15,-46);p.bezierCurveTo(2,-39,-10,-22,-25,-30);},null,tiger?'#bc742e':body,17);c.restore();
   for(const x of [-37,14]){this.path(p=>{p.moveTo(x,-4);p.lineTo(x-5,40+step);p.quadraticCurveTo(x+4,48+step,x+16,41+step);p.lineTo(x+18,-4);p.closePath();},tiger?'#b87530':'#aa8250');}
   this.ellipse(-6,-6,61,39,this.grad(-30,-44,body,tiger?'#cb7a2e':'#bd8246'));
   this.ellipse(2,10,43,18,cream);
   // Close legs and rounded paws.
   for(const [x,dy] of [[-43,-step],[18,step]]){
    this.path(p=>{p.moveTo(x,-3);p.lineTo(x-2,38+dy);p.quadraticCurveTo(x+8,50+dy,x+24,39+dy);p.lineTo(x+23,-3);p.closePath();},this.grad(x,-10,body,'#b77a41'));
    this.ellipse(x+11,39+dy,15,9,cream);this.path(p=>{p.moveTo(x+5,40+dy);p.lineTo(x+5,44+dy);p.moveTo(x+13,40+dy);p.lineTo(x+13,44+dy);},null,'#b18b64',1.5);
   }
   if(tiger){for(let i=0;i<4;i++)this.path(p=>{p.moveTo(-48+i*21,-33);p.lineTo(-39+i*21,-7);p.lineTo(-29+i*21,-29);p.closePath();},'#493c2d');}
   else if(f.breed==='husky'){this.path(p=>{p.moveTo(-54,-22);p.bezierCurveTo(-28,-58,17,-44,35,-15);p.lineTo(20,-1);p.bezierCurveTo(1,-29,-27,-23,-54,-22);},'#546870');}
   else if(f.breed==='becgie'){this.ellipse(-20,-21,31,20,'#574c3d');}
   // Neck scarf provides team identity independent of coat.
   this.path(p=>{p.moveTo(24,-27);p.lineTo(49,-12);p.lineTo(26,5);p.lineTo(9,-21);p.closePath();},f.team==='left'?'#d65d49':'#378b99');
   c.save();c.translate(37,-36+(bark?Math.sin(t*22)*3:0));c.rotate(bark?-.09:Math.sin(t*1.6)*.025);
   const floppy=f.breed==='pug'&&!tiger;
   if(floppy){this.ellipse(-25,-14,15,27,'#514337');this.ellipse(23,-15,15,25,'#514337');}
   else {for(const x of [-21,18]){this.path(p=>{p.moveTo(x-14,-10);p.lineTo(x-5,-54);p.quadraticCurveTo(x+6,-57,x+16,-10);p.closePath();},body,'#b67d47',2);this.path(p=>{p.moveTo(x-7,-17);p.lineTo(x-3,-43);p.lineTo(x+9,-16);p.closePath();},'#d4927b');}}
   this.ellipse(0,0,37,34,this.grad(-25,-28,body,'#cf9456'));
   if(f.breed==='husky'&&!tiger){this.path(p=>{p.moveTo(-33,-16);p.lineTo(-10,-32);p.lineTo(2,-8);p.lineTo(14,-29);p.lineTo(33,-15);p.lineTo(25,19);p.lineTo(-25,17);p.closePath();},cream);}
   if(tiger){this.path(p=>{p.moveTo(-9,-30);p.lineTo(0,-12);p.lineTo(9,-31);p.closePath();},'#493c2d');for(const y of [-6,6]){this.path(p=>{p.moveTo(-34,y);p.lineTo(-19,y+5);p.lineTo(-33,y+9);p.closePath();},'#493c2d');}}
   const mask=floppy?'#635044':cream;
   this.ellipse(16,15,30,20,mask);this.ellipse(-3,16,21,18,mask);
   this.ellipse(-12,-2,4.8,7,'#303b32');this.ellipse(16,-4,5.4,7.5,'#303b32');this.ellipse(-13,-4,1.8,2,'#fff9e5');this.ellipse(15,-6,2,2.2,'#fff9e5');
   if(bark){this.ellipse(26,23,13,15,'#443c36');this.ellipse(27,29,9,6,'#e99090');}
   else this.path(p=>{p.moveTo(17,22);p.quadraticCurveTo(25,29,34,20);},null,'#665342',2);
   this.ellipse(33,10,10,7,tiger?'#bd7975':'#394039');this.ellipse(31,8,4,1.6,'#6a756a');
   this.ellipse(-23,10,5,3,'#dc9876');c.restore();
  }
  dragon(f,t,bark){
   const c=this.ctx,teal=this.grad(-50,-90,'#91d7b4','#368f7b');c.save();c.scale(.86,.86);c.translate(-8,10+Math.sin(t*2)*4);
   // Long S-shaped body, four small claws, mane, antlers and whiskers; no wings.
   const body=p=>{p.moveTo(-86,28);p.bezierCurveTo(-23,72,-93,-39,-35,-20);p.bezierCurveTo(5,-9,-6,49,25,22);p.bezierCurveTo(57,-4,5,-35,47,-49);};
   this.path(body,null,'#386d5c',41);this.path(body,null,teal,35);this.path(p=>{p.moveTo(-83,31);p.bezierCurveTo(-20,65,-79,-30,-33,-15);p.bezierCurveTo(5,-4,0,54,31,24);p.bezierCurveTo(61,-2,15,-23,51,-46);},null,'#e9ce80',12);
   for(let i=0;i<7;i++){const x=-61+i*16,y=10+Math.sin(i*1.2)*15;this.path(p=>{p.moveTo(x,y-8);p.quadraticCurveTo(x+9,y+7,x+13,y-3);},null,'#3f947a',2);}
   for(const [x,y] of [[-29,-19],[21,20]])for(const side of [-1,1]){this.path(p=>{p.moveTo(x,y);p.quadraticCurveTo(x+side*16,y-12,x+side*28,y+12);p.lineTo(x+side*38,y+17);},null,'#52ac91',10);for(let i=0;i<3;i++)this.path(p=>{p.moveTo(x+side*(28+i*4),y+13);p.lineTo(x+side*(31+i*4),y+23);},null,'#f9e4a0',3);}
   for(const [x,y] of [[-72,6],[-53,-42],[-16,-14],[10,0],[20,-39]])this.path(p=>{p.moveTo(x,y);p.lineTo(x-9,y-17);p.lineTo(x+9,y-5);p.closePath();},'#d86c55');
   c.save();c.translate(47,-54);c.rotate(bark?Math.sin(t*18)*.06:0);
   this.path(p=>{p.moveTo(-22,-7);p.lineTo(-40,-25);p.lineTo(-18,-25);p.lineTo(-31,-42);p.lineTo(-6,-30);p.lineTo(10,-42);p.lineTo(16,-19);},'#d66e56');
   for(const x of [-15,14]){this.path(p=>{p.moveTo(x,-25);p.lineTo(x-3,-48);p.lineTo(x+6,-60);p.moveTo(x-3,-48);p.lineTo(x-15,-56);p.moveTo(x-3,-43);p.lineTo(x+8,-48);},null,'#e8c97c',6);}
   this.ellipse(0,-8,31,29,teal);this.ellipse(19,10,32,18,this.grad(4,-10,'#a3dec1','#59b59b'));
   this.path(p=>{p.moveTo(5,-29);p.lineTo(14,-38);p.lineTo(18,-23);p.closePath();},'#3d8f78');
   this.ellipse(-7,-10,5.5,7,'#f3d981');this.ellipse(-6,-10,2.2,6,'#354e3e');this.ellipse(-8,-12,1.4,1.5,'#fff8dd');
   this.ellipse(34,6,12,7,'#e5a08c');this.ellipse(38,4,3,2.5,'#755b4c');
   if(bark){this.ellipse(31,20,15,11,'#405142');this.ellipse(34,24,9,4,'#ef9c92');}
   else this.path(p=>{p.moveTo(16,21);p.quadraticCurveTo(32,27,44,18);},null,'#3d7763',2);
   this.path(p=>{p.moveTo(18,14);p.bezierCurveTo(41,35,65,7,70,22);p.bezierCurveTo(74,36,58,32,62,26);p.moveTo(14,17);p.bezierCurveTo(34,45,71,36,60,49);},null,'#efd38a',2.5);
   this.path(p=>{p.moveTo(-7,21);p.lineTo(-5,45);p.lineTo(4,31);p.lineTo(10,45);p.lineTo(14,24);p.closePath();},'#e9d08b');c.restore();c.restore();
  }
  loop(now){requestAnimationFrame(this.loop);if(!this.state)return;const c=this.ctx,s=this.state,w=600,h=1100,t=now/1000,wall=Date.now();c.setTransform(this.canvas.width/w,0,0,this.canvas.height/h,0,0);c.clearRect(0,0,w,h);
   const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#e5efda');bg.addColorStop(.35,'#e6d9b8');bg.addColorStop(1,'#d2c8a7');c.fillStyle=bg;c.fillRect(0,0,w,h);
   // Layered 2.5D alley: distant gateway, paving, leaf shadows and team lanes.
   this.path(p=>{p.moveTo(35,115);p.lineTo(300,45);p.lineTo(565,115);p.lineTo(565,1050);p.lineTo(300,1090);p.lineTo(35,1050);p.closePath();},'#e9dfc2');
   this.path(p=>{p.moveTo(35,115);p.lineTo(300,45);p.lineTo(300,1090);p.lineTo(35,1050);p.closePath();},'#ecd4b4');
   this.path(p=>{p.moveTo(300,45);p.lineTo(565,115);p.lineTo(565,1050);p.lineTo(300,1090);p.closePath();},'#cfdfcc');
   for(let y=130;y<h;y+=82)this.path(p=>{p.moveTo(35,y);p.lineTo(300,y+30);p.lineTo(565,y);},null,'#b9b99a55',1.5);
   for(let y=180;y<1050;y+=80)this.path(p=>{p.moveTo(300,y);p.lineTo(300,y+24);},null,'#f7f4df',4);
   c.font='700 19px Segoe UI';c.fillStyle='#768a6a';c.textAlign='center';c.fillText(s.phase==='battle'?'HẺM TUẤT · ĐANG GIAO TRANH':'HẺM TUẤT · ĐÓN BẠN MỚI',300,42);
   const fighters=TuatEngine.sceneRoster(s).fighters;
   for(const f of fighters){const x=f.team==='left'?157:443,y=160+f.slot*195,bark=s.phase==='battle'&&!s.paused&&wall-(f.attackAt||0)<650,hit=wall-(f.hitAt||0)<350,dead=f.hp<=0;
    c.save();c.translate(x,y);if(dead)c.globalAlpha=.38;
    this.ellipse(0,53,80,16,'#586d4930');this.ellipse(0,49,66,12,'#f7edce88');
    this.path(p=>p.ellipse(0,48,79,20,0,0,Math.PI*2),null,f.team==='left'?'#cf7961':'#4f9c9d',2);
    c.save();c.scale(f.team==='left'?.87:-.87,.87);if(hit)c.translate(Math.sin(t*65)*4,0);if(dead){c.rotate(-.2);c.translate(0,12);}if(f.form==='dragon')this.dragon(f,t,bark);else this.dog(f,t,bark);c.restore();
    if(bark&&!dead){for(let n=0;n<2;n++){const r=16+((wall-f.attackAt)/600*30+n*12)%45;this.path(p=>p.arc(f.team==='left'?77:-77,-24,r,f.team==='left'?-.7:Math.PI-.7,f.team==='left'?.7:Math.PI+.7),null,'#f4b258',3);}c.font='900 21px Segoe UI';c.fillStyle='#a3623f';c.fillText('GÂU!',f.team==='left'?80:-80,-55);}
    c.globalAlpha=1;c.font='700 18px Segoe UI';c.textAlign='center';c.fillStyle=dead?'#8b8c79':'#374d40';c.fillText(TuatEngine.tuat(f.name),0,78,225);
    const bw=139;c.fillStyle='#bcc5aa';c.beginPath();c.roundRect(-bw/2,88,bw,7,4);c.fill();if(f.hp>0){c.fillStyle=f.team==='left'?'#d87660':'#469c9d';c.beginPath();c.roundRect(-bw/2,88,Math.max(2,bw*f.hp/f.maxHp),7,4);c.fill();}
    c.font='500 13px Segoe UI';c.fillStyle='#788b72';c.fillText(dead?'ĐÃ GỤC · CHỜ HỒI SINH':`${f.hp}/${f.maxHp}`,0,112);c.restore();
   }
   if(s.phase==='break'){c.fillStyle='#243e3633';c.fillRect(0,0,w,h);}
  }
 }
 root.TuatCanvas=TuatCanvas;
})(window);
