import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { clone } from './vendor/SkeletonUtils.js';
import { BarkAudio } from './audio.js';

const $ = id => document.getElementById(id);
const capture = new URLSearchParams(location.search).has('capture');
document.body.classList.toggle('capture', capture);
const audio = new BarkAudio();
const species = [
  {id:'shiba',name:'Shiba vàng',glyph:'🐕',role:'ĐẤU SĨ',by:'Quaternius',height:1.65},
  {id:'husky',name:'Husky',glyph:'🐺',role:'TỐC ĐỘ',by:'Quaternius',height:1.85},
  {id:'pug',name:'Pug mặt xệ',glyph:'🐶',role:'ĐỠ ĐÒN',by:'Quaternius',height:1.2},
  {id:'becgie',name:'Becgie',glyph:'🐕‍🦺',role:'VỆ SĨ',by:'Quaternius',height:1.8},
  {id:'corgi',name:'Corgi',glyph:'🦊',role:'TIẾP SỨC',by:'Gobkit',height:1.25},
  {id:'tiger',name:'Hổ vằn',glyph:'虎',role:'THẦN THÚ',by:'Gobkit',height:2.1},
  {id:'dragon',name:'Rồng thiên không',glyph:'龍',role:'THẦN THÚ',by:'Quaternius',height:2.6},
];
let renderer, scene, camera, arenaGroup, heroGroup, hero, selected = 'shiba';
const library = new Map(), units = [], effects = [], timers = new Set();
const match = {running:false,ended:false,remaining:90,round:1,combo:0,auto:0,loaded:false,mode:'battle'};
const cooldown = {red:0,blue:0};
const seen = new Set();
let noticeTimer;
function notice(message) { $('notice').textContent = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { if (!match.ended) $('notice').textContent = match.mode === 'inspect' ? 'Kéo để xoay · chọn động tác trong Studio' : 'Tiếp sức cho xóm của bạn!'; }, 3500); }
function later(fn, ms) { const t = setTimeout(() => {timers.delete(t); fn();}, ms); timers.add(t); }
function sound(id) { if (!['tiger','dragon'].includes(id)) audio.play(id).catch(e => notice(e.message)); }
function material(color, extra={}) {return new THREE.MeshStandardMaterial({color,roughness:.92,...extra});}
function box(parent,w,h,d,x,y,z,color) {const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function textTexture(text, fg='#f8edcc', bg='#3f5948') {
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.font='bold 54px Segoe UI, Arial';ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64,490);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function setupWorld() {
  renderer=new THREE.WebGLRenderer({canvas:$('arena'),antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  scene=new THREE.Scene();scene.background=new THREE.Color('#ddc99f');
  camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,100);camera.position.set(12,17,19);camera.lookAt(0,.2,0);
  scene.add(new THREE.HemisphereLight(0xfff5da,0x70845c,3));
  const sun=new THREE.DirectionalLight(0xffdfae,4);sun.position.set(-7,13,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:50});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);
  arenaGroup=new THREE.Group();scene.add(arenaGroup);heroGroup=new THREE.Group();scene.add(heroGroup);heroGroup.visible=false;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),material('#c8bc96'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  box(arenaGroup,13,.2,13,0,-.1,0,'#b7ae91');
  box(arenaGroup,12,.025,12,0,.015,0,'#c5b99c');
  // Worn alley paving with subtle warm/cool team halves.
  box(arenaGroup,5.8,.012,10.8,-3,.038,0,'#c8ad8c');box(arenaGroup,5.8,.012,10.8,3,.038,0,'#b3b6a0');
  for(let z=-5;z<=5;z+=1)box(arenaGroup,.065,.015,.45,0,.055,z,'#eee2bd');
  for(let z=-6;z<=6;z+=2) for(let x=-6;x<=6;x+=2) {if(x!==0)box(arenaGroup,1.94,.005,.018,x,.052,z,'#9b9277');}
  for(const x of [-6.4,6.4])box(arenaGroup,.3,.22,13,x,0,0,'#8c9179');
  // Small Vietnamese shop fronts frame the arena, keeping the fighters readable.
  const shops=[[-4.5,'#8b9a71','TẠP HÓA'],[0,'#daab76','HẺM 86'],[4.5,'#8faca5','CÀ PHÊ']];
  for(const [x,color,label] of shops){
    box(arenaGroup,4.1,3.8,2.4,x,1.85,-7.8,color);box(arenaGroup,4.3,.22,2.8,x,3.9,-7.8,'#857357');
    box(arenaGroup,2.7,2.3,.08,x,1.2,-6.55,'#46564a');
    for(let i=-3;i<=3;i++)box(arenaGroup,.025,2.3,.12,x+i*.35,1.2,-6.48,'#63705c');
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.5,.85),new THREE.MeshBasicMaterial({map:textTexture(label)}));sign.position.set(x,3,-6.55);arenaGroup.add(sign);
    const awning=box(arenaGroup,4.1,.14,1.3,x,2.5,-6.15,'#c56b49');awning.rotation.x=.15;
    for(let i=-2;i<=2;i++)box(arenaGroup,.35,.15,1.28,x+i*.75,2.5,-6.14,'#e1cc96');
  }
  // Planters, rounded foliage, and low stools, outside the combat lanes.
  for(const [x,z] of [[-6,4.9],[6,4.9],[-6,-4.5],[6,-4.5]]){
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.42,.32,.65,8),material('#9e694c'));pot.position.set(x,.32,z);pot.castShadow=true;arenaGroup.add(pot);
    const front=z>0;
    if(!front)box(arenaGroup,.17,1.6,.17,x,1.2,z,'#6e6941');
    for(let i=0;i<3;i++){const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(front?.35:.8,1),material(['#718753','#839557','#617947'][i]));leaf.position.set(x+(i-1)*(front?.16:.3),(front?.7:2)+i*(front?.06:.3),z);leaf.scale.set(1,1.1,.9);leaf.castShadow=true;arenaGroup.add(leaf);}
  }
  for(const [x,z] of [[-5.8,1.8],[5.8,-2]]){box(arenaGroup,.65,.12,.65,x,.55,z,'#ba6344');for(const dx of [-.23,.23])for(const dz of [-.23,.23])box(arenaGroup,.09,.5,.09,x+dx,.25,z+dz,'#a4553c');}
  const wirePoints=[];for(let i=0;i<=30;i++){const t=i/30;wirePoints.push(new THREE.Vector3(-8+t*16,5.4-Math.sin(t*Math.PI)*1.2,-6));}
  arenaGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wirePoints),new THREE.LineBasicMaterial({color:'#5c6049'})));
  for(let i=0;i<9;i++){const t=(i+1)/10;const bulb=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshStandardMaterial({color:'#fff0bb',emissive:'#ffd085',emissiveIntensity:.6}));bulb.position.set(-8+t*16,5.2-Math.sin(t*Math.PI)*1.2,-6);arenaGroup.add(bulb);}
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.6,.25,64),material('#c1a97b'));platform.position.y=.1;platform.receiveShadow=true;heroGroup.add(platform);
  new ResizeObserver(resize).observe($('viewport'));resize();
}
function resize() {
  if(!renderer)return;const w=$('viewport').clientWidth,h=$('viewport').clientHeight;if(!w||!h)return;
  renderer.setSize(w,h,false);const aspect=w/h;const half=match.mode==='inspect'?4.4:9.1;
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
}
const clipAliases={idle:['Idle','idle','Flying_Idle','Flying'],walk:['Walk','walk','Run','Gallop','Fast_Flying','Flying'],attack:['Attack','attack','Headbutt','Bite_Front'],dead:['Death','dead']};
function animateUnit(unit,key,once=false) {
  const name=clipAliases[key].find(n=>unit.actions[n]);if(!name)return false;
  const next=unit.actions[name];if(unit.action===next && !once)return true;
  if(unit.action)unit.action.fadeOut(.15);next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(.15);
  next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.play();unit.action=next;unit.clip=key;return true;
}
function createVisual(id) {
  const source=library.get(id), spec=species.find(s=>s.id===id),root=new THREE.Group(),visual=clone(source.scene);
  const mixer=new THREE.AnimationMixer(visual), actions={};for(const clip of source.animations)actions[clip.name.split('|').pop()]=mixer.clipAction(clip);
  const unit={root,visual,mixer,actions,id,hp:200,action:null};root.add(visual);
  animateUnit(unit,'idle');mixer.update(0);visual.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3());
  const scale=spec.height/size.y;visual.scale.multiplyScalar(scale);visual.position.y=-bounds.min.y*scale+.065;
  visual.position.x=-(bounds.max.x+bounds.min.x)*.5*scale;visual.position.z=-(bounds.max.z+bounds.min.z)*.5*scale;
  visual.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;}});
  unit.height=spec.height;return unit;
}
function makeLabel(unit,name) {
  const c=document.createElement('canvas');c.width=256;c.height=80;unit.labelCanvas=c;unit.name=name;
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));label.position.y=unit.height+.55;label.scale.set(1.8,.56,1);label.renderOrder=5;unit.root.add(label);unit.label=label;updateLabel(unit);
}
function updateLabel(u) {const c=u.labelCanvas,ctx=c.getContext('2d');ctx.clearRect(0,0,256,80);ctx.fillStyle='#fbf3dce8';ctx.beginPath();ctx.roundRect(4,4,248,66,18);ctx.fill();ctx.font='bold 26px Segoe UI, Arial';ctx.textAlign='center';ctx.fillStyle='#343c2c';ctx.fillText(u.name,128,34,230);ctx.fillStyle='#d7d1b7';ctx.fillRect(24,46,208,9);ctx.fillStyle=u.team==='red'?'#d75c3d':'#398096';ctx.fillRect(24,46,208*Math.max(0,u.hp/200),9);u.label.material.map.needsUpdate=true;}
function disposeUnit(u) {
  u.mixer.stopAllAction();u.mixer.uncacheRoot(u.visual);u.root.removeFromParent();
  if(u.label){u.label.material.map.dispose();u.label.material.dispose();}
  if(u.ring){u.ring.geometry.dispose();u.ring.material.dispose();}
  // Geometry/material/textures of cloned source models stay shared in the library cache.
}
function spawn(id,team,slot) {
  const u=createVisual(id);u.team=team;u.slot=slot;
  const positions=[[-2.35,-2.2],[-2.35,1.3],[-4.6,-3.8],[-4.6,-.6],[-4.6,3.2]],p=positions[slot];
  u.root.position.set(team==='red'?p[0]:-p[0],0,p[1]);u.root.rotation.y=team==='red'?Math.PI/2:-Math.PI/2;
  u.base=u.root.position.clone();makeLabel(u,`${team==='red'?'Đỏ':'Xanh'} · ${species.find(s=>s.id===id).name.split(' ')[0]}`);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.65,.74,40),new THREE.MeshBasicMaterial({color:team==='red'?'#cd573e':'#3c8293',transparent:true,opacity:.75,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.08;u.root.add(ring);u.ring=ring;arenaGroup.add(u.root);return u;
}
function clearEffects(){for(const e of effects){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();}effects.length=0;}
function reset() {
  for(const t of timers)clearTimeout(t);timers.clear();for(const u of units)disposeUnit(u);units.length=0;clearEffects();
  if(hero){disposeUnit(hero);hero=null;}match.mode='battle';heroGroup.visible=false;arenaGroup.visible=true;$('back-battle').hidden=true;$('inspect-name').hidden=true;
  Object.assign(match,{running:false,ended:false,remaining:90,combo:0,auto:0});cooldown.red=cooldown.blue=0;seen.clear();
  ['shiba','husky','pug','becgie','corgi'].forEach((id,i)=>{units.push(spawn(id,'red',i),spawn(id,'blue',i));});
  camera.position.set(12,17,19);camera.lookAt(0,.2,0);resize();$('start').textContent='▶ Bắt đầu trận';$('combo').textContent='×1';$('match-status').textContent='SẴN SÀNG';$('timer').textContent='01:30';$('round-label').textContent=`VÒNG ${String(match.round).padStart(2,'0')}`;updateScore();notice('Cả xóm đã sẵn sàng!');
}
function hp(team){return units.filter(u=>u.team===team).reduce((n,u)=>n+u.hp,0);}
function updateScore(){for(const team of ['red','blue']){$(`${team}-hp`).textContent=hp(team);$(`${team}-bar`).style.width=`${hp(team)/10}%`;}}
function finish() {
  if(match.ended)return;match.ended=true;match.running=false;$('start').textContent='▶ Chơi lại';$('match-status').textContent='KẾT THÚC';
  const r=hp('red'),b=hp('blue');notice(r===b?'Bất phân thắng bại!':`XÓM ${r>b?'ĐỎ':'XANH'} THẮNG TRẬN!`);
}
function wave(u,color) {const mesh=new THREE.Mesh(new THREE.RingGeometry(.4,.49,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(u.root.position);mesh.position.y=.16;arenaGroup.add(mesh);effects.push({mesh,time:0});}
function attack(team='red',manual=false) {
  if(!match.loaded||match.ended)return false;const now=performance.now();if(now-cooldown[team]<350)return false;
  const attackers=units.filter(u=>u.team===team&&u.hp>0),targets=units.filter(u=>u.team!==team&&u.hp>0);if(!attackers.length||!targets.length)return false;
  cooldown[team]=now;const u=attackers[Math.floor(Math.random()*attackers.length)],target=targets[Math.floor(Math.random()*targets.length)];
  animateUnit(u,'attack',true);u.attackTime=.55;wave(u,team==='red'?'#f4bc51':'#b4dfca');sound(u.id);
  target.hp=Math.max(0,target.hp-(['tiger','dragon'].includes(u.id)?48:28));updateLabel(target);updateScore();
  if(target.hp===0){animateUnit(target,'dead',true);target.ring.material.opacity=.2;}
  later(()=>{if(u.hp>0)animateUnit(u,'idle');},850);
  if(manual){match.combo++;$('combo').textContent=`×${match.combo}`;notice(`GÂU! Xóm ${team==='red'?'Đỏ':'Xanh'} tung đòn!`);}
  if(hp('red')===0||hp('blue')===0)finish();return true;
}
function evolve(team,id) {
  if(!match.loaded||match.ended)return false;const index=units.findIndex(u=>u.team===team&&u.hp>0);if(index<0)return false;
  const old=units[index];if(old.id===id)return false;const replacement=spawn(id,team,old.slot);replacement.hp=old.hp;updateLabel(replacement);disposeUnit(old);units[index]=replacement;wave(replacement,'#ffe68a');notice(`${species.find(s=>s.id===id).name.toUpperCase()} gia nhập xóm ${team==='red'?'Đỏ':'Xanh'}!`);return true;
}
function enqueueEvent(event) {
  if(!event||typeof event.id!=='string'||event.id.length>128||seen.has(event.id)||!['red','blue'].includes(event.team)||!['bark','tiger','dragon'].includes(event.type))return false;
  if(!match.loaded||match.ended)return false;
  seen.add(event.id);if(seen.size>1000)seen.delete(seen.values().next().value);
  return event.type==='bark'?attack(event.team,true):evolve(event.team,event.type);
}
function showBattle() {
  match.mode='battle';if(hero){disposeUnit(hero);hero=null;}heroGroup.visible=false;arenaGroup.visible=true;$('back-battle').hidden=true;$('inspect-name').hidden=true;camera.position.set(12,17,19);camera.lookAt(0,.2,0);resize();
}
function inspect(id) {
  selected=id;const s=species.find(s=>s.id===id);$('asset-title').textContent=s.name;$('asset-detail').textContent=`Rig & animation gốc · ${s.by} · ${library.get(id).animations.length} động tác`;
  document.querySelectorAll('.creature').forEach(b=>b.classList.toggle('selected',b.dataset.id===id));
  match.running=false;$('start').textContent='▶ Tiếp tục trận';$('match-status').textContent=match.ended?'KẾT THÚC':'TẠM DỪNG';match.mode='inspect';arenaGroup.visible=false;heroGroup.visible=true;
  if(hero)disposeUnit(hero);hero=createVisual(id);hero.root.scale.setScalar(1.7);hero.root.rotation.y=-.55;heroGroup.add(hero.root);
  camera.position.set(5,4.5,8);camera.lookAt(0,1.5,0);resize();$('back-battle').hidden=false;$('inspect-name').hidden=false;$('inspect-name').textContent=s.name;
  $('preview-bark').disabled=['tiger','dragon'].includes(id);$('preview-bark').textContent=['tiger','dragon'].includes(id)?'Thần thú · chưa có tiếng gầm':'♫ Nghe tiếng gâu thật';
  for(const b of document.querySelectorAll('[data-clip]'))b.disabled=!clipAliases[b.dataset.clip].some(n=>hero.actions[n]);
  notice('Kéo để xoay · chọn động tác trong Studio');
}
function bind() {
  for(const s of species){const b=document.createElement('button');b.className=`creature ${['tiger','dragon'].includes(s.id)?'beast':''} ${s.id===selected?'selected':''}`;b.dataset.id=s.id;b.innerHTML=`<span class="glyph">${s.glyph}</span><strong>${s.name}</strong><small>${s.role}</small>`;b.disabled=true;b.addEventListener('click',()=>inspect(s.id));$('roster').append(b);}
  $('bark').addEventListener('click',()=>{if(match.mode!=='battle')showBattle();attack('red',true);});
  $('start').addEventListener('click',()=>{if(!match.loaded)return;if(match.ended){match.round++;reset();}showBattle();match.running=!match.running;$('start').textContent=match.running?'Ⅱ Tạm dừng':'▶ Tiếp tục trận';$('match-status').textContent=match.running?'ĐANG ĐẤU':'TẠM DỪNG';audio.unlock().catch(e=>notice(e.message));});
  $('reset').addEventListener('click',()=>{if(match.loaded){match.round++;reset();}});
  $('capture-start').addEventListener('click',()=>$('start').click());
  $('back-battle').addEventListener('click',showBattle);
  $('sound').addEventListener('click',()=>{audio.setMuted(!audio.muted);$('sound').setAttribute('aria-pressed',String(audio.muted));$('sound').textContent=audio.muted?'♫ Đã tắt tiếng':'♫ Âm thanh bật';if(!audio.muted)audio.unlock().catch(e=>notice(e.message));});
  $('preview-bark').addEventListener('click',()=>sound(selected));
  document.querySelectorAll('[data-clip]').forEach(b=>b.addEventListener('click',()=>{if(match.loaded&&(!hero||match.mode!=='inspect'))inspect(selected);if(hero){animateUnit(hero,b.dataset.clip);if(b.dataset.clip==='attack')sound(selected);}}));
  document.querySelectorAll('[data-event]').forEach(b=>b.addEventListener('click',()=>{if(match.mode!=='battle')showBattle();enqueueEvent({id:crypto.randomUUID(),type:b.dataset.event,team:b.dataset.team});}));
  let drag=null;$('arena').addEventListener('pointerdown',e=>{if(match.mode==='inspect'){drag=e.clientX;$('arena').setPointerCapture(e.pointerId);}});$('arena').addEventListener('pointermove',e=>{if(drag!==null&&hero){hero.root.rotation.y+=(e.clientX-drag)*.012;drag=e.clientX;}});$('arena').addEventListener('pointerup',()=>drag=null);$('arena').addEventListener('pointercancel',()=>drag=null);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&match.running){match.running=false;$('start').textContent='▶ Tiếp tục trận';$('match-status').textContent='TẠM DỪNG';}});
}
function stats() {return { ...match, hp:{red:hp('red'),blue:hp('blue')}, units:units.map(u=>({id:u.id,team:u.team,hp:u.hp,clip:u.clip})),models:[...library.keys()],drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,audio:{ready:audio.buffers.size===2,muted:audio.muted,active:audio.active},hero:hero?.id };}
// Local bridge for a future server connector. Never accepts arbitrary HTML or executable content.
window.DogBattle={enqueueEvent,getState:stats};
async function main() {
  try {
    setupWorld();bind();$('bark').disabled=true;
    let count=0;const loader=new GLTFLoader();
    await Promise.all(species.map(async s=>{const gltf=await loader.loadAsync(`assets/models/${s.id}.glb`);if(!gltf.animations.length)throw new Error(`Model ${s.name} thiếu animation`);library.set(s.id,gltf);$('load-count').textContent=`${++count} / 7`;}));
    match.loaded=true;reset();$('loading').hidden=true;$('bark').disabled=false;document.querySelectorAll('.creature').forEach(b=>b.disabled=false);
    let prev=performance.now();
    renderer.setAnimationLoop(now=>{
      const elapsed=Math.max(0,(now-prev)/1000);prev=now;const dt=Math.min(elapsed,.05);
      if(match.running&&!match.ended){match.remaining=Math.max(0,match.remaining-elapsed);match.auto+=elapsed;if(match.auto>=1.5){match.auto=0;attack(Math.random()>.5?'red':'blue');}const t=Math.ceil(match.remaining);$('timer').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;if(!t)finish();}
      if(match.mode==='battle')for(const u of units){u.mixer.update(dt);if(u.attackTime>0){u.attackTime-=dt;u.root.position.x=u.base.x+Math.sin(Math.max(0,u.attackTime)/.55*Math.PI)*.35*(u.team==='red'?1:-1);}else u.root.position.copy(u.base);}
      if(hero)hero.mixer.update(dt);
      for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.time+=dt;e.mesh.scale.setScalar(1+e.time*4);e.mesh.material.opacity=Math.max(0,.8-e.time);if(e.time>=.8){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();effects.splice(i,1);}}
      renderer.render(scene,camera);
    });
  } catch(e) {console.error(e);$('loading').hidden=true;$('fatal').hidden=false;$('fatal').textContent=`Không tải được sàn đấu: ${e.message}. Chạy bằng npm start, kiểm tra WebGL rồi tải lại trang.`;}
}
main();
