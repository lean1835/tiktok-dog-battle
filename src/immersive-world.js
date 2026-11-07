import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {paintGiftBoard} from './live-gift-board.mjs';
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.92,...extra});
function box(parent,w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function ball(parent,x,y,z,r,color){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),material(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function texture(w,h){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return{canvas,ctx:canvas.getContext('2d'),texture:tex};}
function board(parent,w,h,x,y,z){const t=texture(768,Math.round(768*h/w));box(parent,w+.2,h+.2,.17,x,y,z-.12,'#5e4b31');box(parent,w+.09,h+.09,.06,x,y,z-.01,'#caa05e');const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t.texture}));plane.position.set(x,y,z+.03);plane.userData.dynamic=true;parent.add(plane);t.material=plane.material;return t;}
function base(t){const c=t.ctx,w=t.canvas.width,h=t.canvas.height;const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#304b3c');g.addColorStop(1,'#1c352b');c.fillStyle=g;c.fillRect(0,0,w,h);c.strokeStyle='#c9ad73';c.lineWidth=4;c.strokeRect(14,14,w-28,h-28);c.textAlign='center';c.textBaseline='middle';return c;}
function text(c,value,x,y,size,color='#f6edcb',weight=650,max){c.font=`${weight} ${size}px Segoe UI, Arial`;c.fillStyle=color;c.fillText(String(value),x,y,max);}
function lighting(scene){scene.add(new THREE.HemisphereLight('#fff2d6','#78906c',2.9));const sun=new THREE.DirectionalLight('#ffe2ae',3.6);sun.position.set(-13,28,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:28,bottom:-28,near:1,far:110});sun.shadow.normalBias=.04;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);}
function staticBatch(group){
 group.updateMatrixWorld(true);const buckets=new Map(),original=[];
 group.traverse(m=>{if(m.isMesh&&!m.material.map&&!m.userData.dynamic){const key=[m.material.color.getHex(),m.material.emissive.getHex(),m.material.emissiveIntensity,m.material.roughness].join('|');if(!buckets.has(key))buckets.set(key,{material:m.material,geometries:[]});buckets.get(key).geometries.push(m.geometry.clone().applyMatrix4(m.matrixWorld));original.push(m);}});
 for(const m of original){m.removeFromParent();m.geometry.dispose();}
 for(const b of buckets.values()){const merged=mergeGeometries(b.geometries);if(merged){const m=new THREE.Mesh(merged,b.material);m.castShadow=m.receiveShadow=true;group.add(m);}b.geometries.forEach(g=>g.dispose());}
}
export function createModelStudio(scene,group){lighting(scene);const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),material('#e5ddc2'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.8,.22,64),material('#c7b58b'));pedestal.position.y=-.08;pedestal.receiveShadow=true;group.add(pedestal);return{update(){}};}
export function populateWorld(scene,group){
 lighting(scene);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),material('#c7ba96'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 box(group,21,.3,40,0,-.15,5,'#9c9c7b');box(group,20.3,.06,39.3,0,.015,5,'#d8c6a0');
 // The court and its spectator walkways all occupy the same physical scene.
 box(group,10.5,.04,22,0,.07,2.5,'#d9caa6');box(group,5.1,.015,21.7,-2.6,.1,2.5,'#debea0');box(group,5.1,.015,21.7,2.6,.1,2.5,'#bdd0b4');
 for(let z=-9;z<25;z+=1.65)for(let x=-9;x<=9;x+=2.3){box(group,2.25,.008,.02,x+(Math.round(z)%2?0:.35),.06,z,'#b1a982');}
 for(let z=-7;z<13;z+=1.5)box(group,.08,.025,.56,0,.13,z,'#f7efd3');
 for(const x of [-5.6,5.6]){box(group,.22,.28,22,x,.14,2.5,'#9c8c67');for(let z=-7.7;z<=13.2;z+=1.9){box(group,.15,.75,.15,x,.58,z,'#917450');}box(group,.14,.13,22,x,.92,2.5,'#ac8d5f');}
 for(const z of [-8.5,13.5]){box(group,11.4,.15,.17,0,.27,z,'#ad9471');}
 // Shop frontage and a large clock physically installed above the middle roof.
 for(const [x,color,label] of [[-6,'#b8c195','TẠP HÓA'],[0,'#e1be88','HẺM TUẤT'],[6,'#9dbbb1','CÀ PHÊ']]){
  box(group,5.8,4.5,3.2,x,2.2,-12.4,color);box(group,4.2,2.65,.14,x,1.45,-10.7,'#4e6752');
  for(let i=-4;i<=4;i++)box(group,.045,2.6,.19,x+i*.44,1.45,-10.6,'#7c8c6a');
  const roof=new THREE.Mesh(new THREE.ConeGeometry(4.35,1.7,4),material('#a77e4a'));roof.rotation.y=Math.PI/4;roof.scale.z=.66;roof.position.set(x,5.1,-12.5);roof.castShadow=true;group.add(roof);
  box(group,6.1,.18,3.7,x,4.35,-12.1,'#aa8655');
  const sign=board(group,4.8,.8,x,3.65,-10.6),c=base(sign);text(c,label,384,sign.canvas.height/2,67,'#f9e9be');sign.texture.needsUpdate=true;
  for(let i=-3;i<=3;i++){const a=box(group,.81,.12,1.35,x+i*.81,2.9,-10.1,i%2?'#d9784e':'#f1d59b');a.rotation.x=.15;}
 }
 for(const x of [-3.6,3.6])box(group,.16,2.8,.18,x,5.7,-11,'#745334');
 const roof=board(group,9.2,3.05,0,6.5,-10.8);
 // Side signs are set into the courtyard, like the reference's in-scene notices.
 for(const x of [-6,5.85]){box(group,.18,4,.18,x,2,-4.6,'#745936');}
 const crowdSign=board(group,8,.65,0,.65,14.3);
 const guide=board(group,4,6.1,-6,4.5,-4.5),gifts=board(group,4.6,8.6,5.85,4.8,-4.5);gifts.material.toneMapped=false;
 const g=base(guide),gw=guide.canvas.width;
 text(g,'CÁCH CHƠI',gw/2,85,66,'#e6c37d',800);
 g.strokeStyle='#9b9f6c';g.lineWidth=2;g.beginPath();g.moveTo(55,145);g.lineTo(gw-55,145);g.stroke();
 const steps=[['THẢ TIM / CHAT GÂU','Tuất sủa → cộng điểm'],['HỔ / RỒNG → ĐÁNH','Kỹ năng tự động · 30 giây'],['ĐỨNG NGOÀI CỔ VŨ','Hoa → Đỏ · Kem → Xanh']];
 steps.forEach(([a,b],i)=>{text(g,a,gw/2,220+i*170,48,'#e4cfa1',750,gw-70);text(g,b,gw/2,282+i*170,40,'#d4dfbb',500,gw-65);});
 text(g,'2 PHÚT ĐẤU / 3 PHÚT NGHỈ',gw/2,guide.canvas.height-65,32,'#a6bd8c',600,gw-65);guide.texture.needsUpdate=true;
 // Spectator patio: low steps, benches, and warm lanterns keep it part of the yard.
 for(const z of [15.5,19.0,22.5]){box(group,17,.18,1.1,0,.12,z,'#b8a580');box(group,17,.06,.13,0,.24,z-.56,'#e5d6b5');}
 for(const [x,z] of [[-7,1],[7,1],[-7,13],[7,13],[-6.8,23],[6.8,23]]){
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.65,.48,.9,9),material('#ad7754'));pot.position.set(x,.45,z);pot.castShadow=true;group.add(pot);
  for(let i=0;i<3;i++){const bush=ball(group,x+(i-1)*.3,1.2+i*.1,z,.7,['#738a4b','#8c9c5b','#5d7d47'][i]);bush.scale.y=.8;}
 }
 for(const [x,z] of [[-9,-8.5],[9,-8.5]]){box(group,.25,4.6,.25,x,2.3,z,'#766044');ball(group,x,4.3,z,.49,'#e5b864');}
 for(let i=0;i<13;i++){const x=-10+i*1.67,y=5.4-Math.sin(i/12*Math.PI)*.55;const lamp=ball(group,x,y,-9.7,.13,'#fff0ba');lamp.material.emissive.set('#e9b957');lamp.material.emissiveIntensity=.7;}
 const wire=[];for(let i=0;i<=30;i++){const a=i/30;wire.push(new THREE.Vector3(-10+a*20,5.55-Math.sin(a*Math.PI)*.55,-9.7));}group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire),new THREE.LineBasicMaterial({color:'#6c7751'})));
 staticBatch(group);
 let crowdKey='',guideKey='',roofKey='',giftKey='';const illustrations=new Map();const imageFor=row=>{const src=window.TuatGiftArt.uri(row.imageKey);if(!illustrations.has(src)){const img=new Image();illustrations.set(src,img);img.onload=()=>{giftKey='';};img.src=src;}const img=illustrations.get(src);return img.complete&&img.naturalWidth?img:null;};const metrics={left:0,right:0,leftRatio:.5,clock:'05:00'};
 return{metrics,update(s,now){
  const seconds=Math.ceil(s.phase==='ready'?s.config.roundSeconds:s.paused||s.preparationVoice?s.remaining:Math.max(0,(s.phaseEnd-now)/1000)),clock=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  const count=window.TuatEngine.waiting(s).length;if(crowdKey!==count){crowdKey=count;const c=base(crowdSign);text(c,`HỘI CỔ VŨ · ${count} TUẤT`,crowdSign.canvas.width/2,crowdSign.canvas.height/2,39,'#f6edcb',750,crowdSign.canvas.width-65);crowdSign.texture.needsUpdate=true;}
  const leaders=window.TuatEngine.winLeaders(s,3);while(leaders.length<3)leaders.push({id:'empty-'+leaders.length,name:'Chưa có danh hiệu',rank:leaders.length+1,wins:0,placeholder:true});const leaderKey=JSON.stringify(leaders.map(p=>[p.id,p.name,p.wins,p.rounds,p.rank]));if(leaderKey!==guideKey){guideKey=leaderKey;const c=guide.ctx;c.fillStyle='#233d31';c.fillRect(25,755,gw-50,315);text(c,'VINH DANH SỐ TRẬN THẮNG',gw/2,788,37,'#e6c37d',800,gw-75);if(!leaders.length)text(c,'Chờ những chiến thắng đầu tiên',gw/2,925,32,'#d4dfbb',500,gw-75);leaders.forEach((p,i)=>{const y=850+i*82;c.textAlign='left';text(c,'#'+p.rank,52,y,35,'#e6c37d',800);text(c,p.placeholder?p.name:window.TuatEngine.tuat(p.name),120,y,33,'#f6edcb',700,gw-325);c.textAlign='right';text(c,p.wins+' THẮNG',gw-55,y,32,'#e6c37d',800);});c.textAlign='center';guide.texture.needsUpdate=true;}
  const l=window.TuatEngine.points(s,'left'),r=window.TuatEngine.points(s,'right'),ratio=l+r?l/(l+r):.5;
  Object.assign(metrics,{left:l,right:r,leftRatio:ratio,clock});
  const key=JSON.stringify([clock,l,r,s.phase,s.paused,s.config.title,s.config.leftName,s.config.rightName,s.result?.id,s.broadcast?.connected,s.broadcast?.username]);
  if(key!==roofKey){roofKey=key;const c=base(roof),w=roof.canvas.width,h=roof.canvas.height;
   text(c,s.config.title,w/2,28,21,'#b7c79a',700,w-70);
   text(c,clock,w/2,85,84,'#fbefc7',850);
   text(c,s.paused?'TẠM DỪNG':s.phase==='prepare'?'CHUẨN BỊ · DANH SÁCH 5 VS 5':s.phase==='ready'?'CHỜ MỞ SÀN · 5 VS 5':s.phase==='break'?'NGHỈ · ĐÓN TUẤT MỚI':`TRẬN ${String(s.round||1).padStart(2,'0')} · 5 VS 5`,w/2,136,20,'#b8c99a');
   const x=55,y=158,bw=w-110;c.fillStyle='#3a8797';c.fillRect(x,y,bw,24);c.fillStyle='#cb6750';c.fillRect(x,y,bw*ratio,24);c.fillStyle='#fff2c8';c.fillRect(x+bw*ratio-2,y-3,4,30);
   c.textAlign='left';text(c,s.config.leftName,x,203,20,'#e4a18b',700,270);c.textAlign='right';text(c,s.config.rightName,w-x,203,20,'#a7d0cf',700,270);c.textAlign='center';
   // Bottom line stays integrated in the roof sign, including the round's winner.
   if(s.phase==='break'&&s.result){const winner=s.result.winner==='draw'?'HAI XÓM HÒA NHAU':`${s.config[s.result.winner==='left'?'leftName':'rightName']} THẮNG`;text(c,`${winner} · ${window.TuatEngine.tuat(s.result.king?.name||'Ẩn danh')}`,w/2,h-30,25,'#e8cc89',700,w-70);}
   else text(c,`ĐỎ ${l}  /  ${r} XANH · ĐIỂM · ${s.broadcast?(s.broadcast.connected?'LIVE @'+s.broadcast.username:'CHỜ KẾT NỐI'):'DEMO'}`,w/2,h-28,20,'#a5ba91',500,w-60);
   roof.texture.needsUpdate=true;
  }
  const giftState=JSON.stringify([s.config.gifts,s.config.healHp,s.config.revivePercent,s.broadcast?.giftRows]);if(giftState!==giftKey){giftKey=giftState;   const rows=s.broadcast?.giftRows||['rose','cake','tiger','dragon','heal','revive','execute'].map(id=>{const d=window.TuatEngine.GIFT_DEFS.find(g=>g.id===id);return{id,imageKey:window.TuatGiftArt.find({rose:'5655',cake:'5827',tiger:'18198',dragon:'7610',heal:'5487',revive:'5659',execute:'5509'}[id])?.id,title:(d.displayName||d.name).toUpperCase(),enabled:true,cost:`${s.config.gifts[id]} xu`,names:id==='rose'?'Hoa':id==='cake'?'Kem':'Quà demo',description:d.description};});
   paintGiftBoard(gifts.ctx,gifts.canvas.width,gifts.canvas.height,rows,{imageFor,art:window.TuatGiftArt,config:s.config,live:!!s.broadcast});gifts.texture.needsUpdate=true;
  }
 }};
}
