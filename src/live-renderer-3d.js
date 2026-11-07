import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone} from './vendor/SkeletonUtils.js';
import {populateWorld,createModelStudio} from './immersive-world.js';
import {fitModel,requireModelTextures,prepareBarkRig,prepareNaturalJaw,applyGroundedBark} from './model-presentation.mjs';
import {LiveCameraDirector} from './live-camera.mjs';
import {BakedCrowd,bakeCrowdParts,crowdLayout} from './live-crowd.mjs';
import {CrowdLabels,nameplateFill,drawName,NAMEPLATE_WIDTH,NAMEPLATE_HEIGHT} from './live-crowd-labels.mjs';
import barkRhythm from './live-bark-rhythm.js';
const {planBark}=barkRhythm;
import {fireEffects,clawEffects} from './live-combat-fx.mjs';

const MODEL_DATA=__MODEL_DATA__;
const heights={shiba:1.65,husky:1.8,pug:1.3,becgie:1.8,corgi:1.3,tiger:2};
const aliases={idle:['Idle','idle'],walk:['Walk','walk','Run','Gallop'],attack:['Attack','attack'],dead:['Death','dead']};
const positions=[[-2.55,-5],[-2.55,-1.5],[-2.55,2],[-2.55,5.5],[-2.55,9]];
const modelIds=['shiba','husky','pug','becgie','corgi','tiger','dragon'];
// Portrait overview: larger fighters, with both side signs and all spectator rows in frame.
const overview={halfWidth:8.6,focus:[0,2,3.3],distance:31,height:23};
function mat(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.8,...extra});}
function ell(parent,x,y,z,rx,ry,rz,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),material);m.scale.set(rx,ry,rz);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function tube(parent,points,radius,color,taper=false){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),g=new THREE.TubeGeometry(curve,40,radius,8,false);if(taper){const a=g.attributes.position;for(let i=0;i<=40;i++){const center=curve.getPointAt(i/40),scale=.22+.78*Math.sin(i/40*Math.PI/2);for(let j=0;j<=8;j++){const k=i*9+j;a.setXYZ(k,center.x+(a.getX(k)-center.x)*scale,center.y+(a.getY(k)-center.y)*scale,center.z+(a.getZ(k)-center.z)*scale);}}g.computeVertexNormals();}const m=new THREE.Mesh(g,mat(color));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function makeChineseDragon(){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);const jade=mat('#51aa84'),jadeLight=mat('#82caa0'),gold=mat('#e6c879'),hornMat=mat('#dec88a'),coral=mat('#c7694d'),black=mat('#1f3a30'),white=mat('#fff8d8');
 const path=[[-.85,.28,-1.45],[-1.05,.55,-.8],[-.55,.8,-.35],[.35,.85,-.15],[.58,1.2,.35],[.1,1.65,.55],[.06,1.95,1.03]];
 tube(body,path,.28,'#4ca582',true);
 tube(body,path.slice(1).map(([x,y,z])=>[x,y-.15,z+.12]),.12,'#e4c780');
 // Neck mane and spinal fins follow the long body rather than wing silhouettes.
 for(let i=1;i<path.length-1;i++){const [x,y,z]=path[i];const spike=new THREE.Mesh(new THREE.ConeGeometry(.12,.32,5),coral);spike.position.set(x,y+.29,z-.07);spike.rotation.x=-.5;spike.castShadow=true;body.add(spike);}
 for(const [x,y,z] of [[-.48,.74,-.35],[.45,1.04,.15]])for(const side of [-1,1]){
  tube(body,[[x,y,z],[x+side*.3,y-.16,z+.08],[x+side*.42,y-.36,z+.23]],.075,'#65b68d');
  ell(body,x+side*.43,y-.35,z+.28,.13,.07,.16,jadeLight);
  for(let k=0;k<3;k++)tube(body,[[x+side*.43+(k-1)*.07,y-.34,z+.36],[x+side*.43+(k-1)*.08,y-.38,z+.49]],.022,'#ebd38c');
 }
 const head=new THREE.Group();head.position.set(.06,1.99,1.03);body.add(head);
 ell(head,0,.04,0,.38,.31,.39,jade);ell(head,0,-.08,.34,.33,.2,.42,jadeLight);ell(head,0,-.02,.63,.22,.11,.12,mat('#ce9c78'));
 for(const side of [-1,1]){
  ell(head,side*.285,.13,.2,.115,.14,.105,gold);ell(head,side*.32,.135,.255,.053,.1,.045,black);ell(head,side*.333,.17,.28,.02,.035,.02,white);
  ell(head,side*.12,.015,.7,.036,.028,.022,black);
  const ear=ell(head,side*.38,.1,-.02,.16,.08,.24,jadeLight);ear.rotation.z=side*.4;ear.rotation.x=-.5;
  tube(head,[[side*.21,.25,-.11],[side*.28,.57,-.2],[side*.42,.8,-.13]],.045,'#e0c98a');
  tube(head,[[side*.28,.56,-.2],[side*.15,.68,-.35]],.032,'#e0c98a');
  tube(head,[[side*.28,.48,-.17],[side*.47,.62,-.28]],.027,'#e0c98a');
  tube(head,[[side*.2,-.07,.52],[side*.6,-.1,.83],[side*.77,-.04,.62],[side*.69,.03,.54]],.018,'#e9cc7d');
  for(let i=0;i<3;i++){const spike=new THREE.Mesh(new THREE.ConeGeometry(.13,.36,5),coral);spike.position.set(side*.27,(i-1)*.15,-.29);spike.rotation.x=-1.4;spike.rotation.z=side*.45;head.add(spike);}
 }
 const jaw=new THREE.Group();jaw.position.set(0,-.22,.15);head.add(jaw);ell(jaw,0,0,.2,.27,.07,.37,jade);ell(jaw,0,.035,.35,.15,.02,.13,mat('#d47e72'));
 for(const side of [-1,1]){tube(head,[[side*.09,-.23,.35],[side*.13,-.52,.26],[side*.05,-.63,.38]],.035,'#e4ce88');}
 return {root,body,head,jaw,height:2.9};
}

class Tuat3DCanvas{
 constructor(canvas){
  this.canvas=canvas;this.visualPool=new Map();this.pooledVisuals=0;this.state=null;this.units=new Map();this.spectators=new Map();this.library=new Map();this.ready=false;this.error=null;this.effects=[];this.elapsed=0;this.drag=null;this.yaw=.02;this.resourceDisposals=0;this.active=true;this.previewZoom=1;this.lastDraw=0;this.isPreview=new URLSearchParams(location.search).has('preview');
  this.isStream=new URLSearchParams(location.search).has('studio')||new URLSearchParams(location.search).has('capture');const requested=new URLSearchParams(location.search).get('model');this.inspector=modelIds.includes(requested)?requested:null;
  this.director=new LiveCameraDirector();this.reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;this.broadcast=canvas.closest('#broadcast');
  if(!this.inspector){this.chatBubbles=new Map();this.chatLayer=document.createElement('div');this.chatLayer.className='scene-chats';this.chatLayer.setAttribute('aria-live','off');canvas.parentElement.append(this.chatLayer);}
  this.loading=document.createElement('div');this.loading.className='model-loading';this.loading.textContent='Đang gọi cả xóm 3D…';canvas.parentElement.append(this.loading);
  try{
   this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});this.renderer.setPixelRatio(this.pixelRatio());this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
   this.scene=new THREE.Scene();this.scene.background=new THREE.Color(this.inspector?'#e7dfc5':'#d7c49d');this.group=new THREE.Group();this.scene.add(this.group);this.world=this.inspector?createModelStudio(this.scene,this.group):populateWorld(this.scene,this.group);
   this.camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,100);this.resize();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
   canvas.addEventListener('pointerdown',e=>{if(this.inspector){this.drag=e.clientX;canvas.setPointerCapture(e.pointerId);}});canvas.addEventListener('pointermove',e=>{if(this.drag!==null&&this.inspector){this.yaw+=(e.clientX-this.drag)*.009;this.drag=e.clientX;this.positionCamera();}});canvas.addEventListener('pointerup',()=>this.drag=null);canvas.addEventListener('pointercancel',()=>this.drag=null);
   canvas.addEventListener('wheel',e=>{if(this.inspector){e.preventDefault();this.previewZoom=THREE.MathUtils.clamp(this.previewZoom-e.deltaY*.001,.75,1.6);this.resize();}},{passive:false});
   window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin)return;if(e.data?.type==='tuat:shot'&&this.isPreview&&!this.inspector)this.previewShot(e.data.kind,e.data.strength);if(!this.inspector)return;if(e.data?.type==='tuat:model'&&modelIds.includes(e.data.model))this.setModel(e.data.model);if(e.data?.type==='tuat:clip'&&['idle','walk','attack','dead'].includes(e.data.clip))this.inspectClip(e.data.clip);if(e.data?.type==='tuat:visibility')this.active=!!e.data.active;});
   this.previous=performance.now();this.renderer.setAnimationLoop(now=>this.frame(now));this.load();
  }catch(e){this.fail(e);}
 }
 fail(e){this.error=e.message;this.loading.textContent='Không mở được cảnh 3D: '+e.message;this.loading.classList.add('model-error');console.error(e);}
 pixelRatio(){return Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,this.isPreview||this.isStream?1:1.5);}
 async load(){try{
  const loader=new GLTFLoader();let count=0;
  await Promise.all(Object.entries(MODEL_DATA).map(async([id,encoded])=>{
   const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),buffer=await new Response(stream).arrayBuffer();
   const model=await new Promise((resolve,reject)=>loader.parse(buffer,'',resolve,reject));requireModelTextures(model,id);this.library.set(id,model);this.loading.textContent=`Gọi cả xóm… ${++count}/6`;
  }));
  this.ready=true;this.loading.remove();if(this.inspector)this.setModel(this.inspector);else if(this.state){this.director.consume(this.state,Date.now());this.sync(this.state);}
 }catch(e){this.fail(e);}}
 overviewPose(){const focus=new THREE.Vector3(...overview.focus);return{focus,eye:focus.clone().add(new THREE.Vector3(Math.sin(this.yaw)*overview.distance,overview.height,Math.cos(this.yaw)*overview.distance))};}
 positionCamera(){if(!this.camera)return;if(this.inspector){this.camera.position.set(Math.sin(this.yaw)*7,3.6,Math.cos(this.yaw)*7);this.camera.lookAt(0,1.15,0);}else{const {focus,eye}=this.overviewPose();this.camera.position.copy(eye);this.camera.lookAt(focus);this.cameraFocus=focus;}}
 resize(){if(!this.renderer)return;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;const scale=this.isPreview?Math.min(1,(typeof innerWidth==='number'?innerWidth:w)/w,(typeof innerHeight==='number'?innerHeight:h)/h):1;this.renderer.setSize(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)),false);const aspect=w/h,halfW=this.inspector?3.2/this.previewZoom:overview.halfWidth,halfH=halfW/aspect;this.camera.left=-halfW;this.camera.right=halfW;this.camera.top=halfH;this.camera.bottom=-halfH;this.camera.updateProjectionMatrix();this.positionCamera();}
 play(u,key){if(u.dragon){u.clip=key;return;}const name=aliases[key].find(n=>u.actions[n]);if(!name)return;const next=u.actions[name];if(u.action===next&&key!=='attack')return;if(u.action)u.action.fadeOut(.15);const loop=['idle','walk'].includes(key);next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).fadeIn(.15).setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);next.clampWhenFinished=!loop;next.play();u.action=next;u.clip=key;}
 startBark(u,at,count=1,interactive=false){if(!interactive&&u.barkRhythm?.until>Date.now())return;u.barkCycle=interactive?380:420;const ongoing=u.barking&&u.barkUntil>Date.now();if(interactive)u.barkRhythm=planBark(u.barkRhythm,at,count);u.barkUntil=Math.max(u.barkUntil||0,interactive?u.barkRhythm.until:at+Math.min(1500,520+Math.sqrt(count)*180));if(ongoing)return;u.barkStartedAt=at;u.barking=true;if(u.barkAction){u.barkAction.reset().setEffectiveWeight(.35).setEffectiveTimeScale(Math.max(.5,u.barkDuration/(u.barkCycle/1000))).setLoop(THREE.LoopRepeat,Infinity).fadeIn(.025).play();u.barking=true;}}

 mouthPosition(u){u.root.updateWorldMatrix(true,true);const anchor=u.soundAnchor||u.mouthAnchor;return anchor?anchor.getWorldPosition(new THREE.Vector3()):u.root.localToWorld(new THREE.Vector3(0,u.height*.68,.65));}
 setModel(model){this.inspector=model;if(!this.ready)return;for(const u of this.units.values())this.dispose(u);this.units.clear();const f={id:'model-preview',name:model,team:'left',slot:0,breed:['tiger','dragon'].includes(model)?'shiba':model,form:['tiger','dragon'].includes(model)?model:'dog',hp:200,maxHp:200};const u=this.visual(f);u.fighter=f;u.base.set(0,0,0);u.root.position.copy(u.base);u.root.rotation.y=-.6;u.label.visible=false;u.ring.visible=false;this.units.set(f.id,u);this.yaw=.1;this.resize();}
 inspectClip(key){const u=this.units.get('model-preview');if(!u)return;u.fighter.hp=key==='dead'?0:200;if(key==='attack'&&u.form==='dog'){this.play(u,'idle');this.startBark(u,Date.now());return;}this.play(u,key);if(key==='attack'){u.attackUntil=Date.now()+1100;if(u.action)u.action.setLoop(THREE.LoopRepeat,Infinity);}}
 visual(f){
  const wanted=f.form==='dog'?f.breed:f.form,pool=this.visualPool?.get(wanted);if(pool?.length){this.pooledVisuals--;const cached=pool.pop(),u={};for(const key of ['root','key','form','actions','visual','mixer','height','fitted','lean','mouthAnchor','headBone','barkAction','barkDuration','naturalJaw','soundAnchor','dragon','ring','labelCanvas','label'])u[key]=cached[key];u.clip='idle';u.lastAttack=0;u.lastHit=0;u.root.scale.setScalar(1);const pos=positions[f.slot];u.root.position.set(f.team==='left'?pos[0]:-pos[0],.08,pos[1]);u.root.rotation.set(0,f.team==='left'?Math.PI/2:-Math.PI/2,0);u.base=u.root.position.clone();u.team=f.team;this.resizeLabel(u,120);u.label.visible=true;u.label.scale.set(2.2,.53,1);u.label.material.opacity=1;u.ring.visible=true;u.ring.material.color.set(f.team==='left'?'#d37051':'#4d9eaa');u.ring.material.opacity=.7;if(u.lean)applyGroundedBark(u.lean,0);u.naturalJaw?.update(0);if(u.dragon){u.dragon.body.rotation.z=0;u.dragon.head.rotation.x=0;u.dragon.jaw.rotation.x=0;}else{this.play(u,'idle');u.mixer.update(0);u.visual.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});}this.group.add(u.root);return u;}
  const root=new THREE.Group();let u={root,key:f.form==='dog'?f.breed:f.form,form:f.form,actions:{},clip:'idle',lastAttack:0,lastHit:0};
  if(f.form==='dragon'){u.dragon=makeChineseDragon();u.dragon.root.scale.setScalar(.8);root.add(u.dragon.root);u.height=u.dragon.height*.8;u.mouthAnchor=new THREE.Object3D();u.mouthAnchor.position.set(0,-.07,.72);u.dragon.head.add(u.mouthAnchor);}
  else{
   const src=this.library.get(u.key)||this.library.get('shiba'),visual=clone(src.scene);u.visual=visual;u.mixer=new THREE.AnimationMixer(visual);for(const clip of src.animations)u.actions[clip.name]=u.mixer.clipAction(clip);this.play(u,'idle');u.mixer.update(0);visual.updateMatrixWorld(true);
   u.height=heights[u.key]||1.6;u.fitted=fitModel(visual,u.key,u.height);u.lean=new THREE.Group();u.lean.add(u.fitted);root.add(u.lean);const barkRig=prepareBarkRig(root,visual,src.animations,u.height);u.mouthAnchor=barkRig.anchor;u.headBone=barkRig.head;if(barkRig.clip){u.barkAction=u.mixer.clipAction(barkRig.clip);u.barkDuration=barkRig.clip.duration;}
   if(f.form==='dog'&&!barkRig.jaw){u.naturalJaw=prepareNaturalJaw(root,visual,barkRig.head,u.height,u.key);u.soundAnchor=u.naturalJaw?.soundAnchor;}
   visual.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;}});
  }
  const ring=new THREE.Mesh(new THREE.RingGeometry(.7,.79,40),new THREE.MeshBasicMaterial({color:f.team==='left'?'#d37051':'#4d9eaa',transparent:true,opacity:.7,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.08;root.add(ring);u.ring=ring;
  const c=document.createElement('canvas');c.width=512;c.height=120;u.labelCanvas=c;const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  u.label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true,toneMapped:false}));u.label.position.y=u.height+.5;u.label.scale.set(2.2,.53,1);u.label.renderOrder=10;root.add(u.label);
  const p=positions[f.slot];root.position.set(f.team==='left'?p[0]:-p[0],.08,p[1]);root.rotation.y=f.team==='left'?Math.PI/2:-Math.PI/2;u.base=root.position.clone();u.team=f.team;this.group.add(root);return u;
 }
 label(u,f){const cooldown=f.form==='dog'?null:Math.max(0,Math.ceil((this.state?.paused?(f.skillRemaining??30000):((f.skillReadyAt??Date.now()+30000)-Date.now()))/1000));const key=[f.name,f.hp,f.maxHp,f.bot,cooldown].join('|');if(u.labelKey===key)return;u.labelKey=key;const c=u.labelCanvas,ctx=c.getContext('2d');ctx.clearRect(0,0,512,c.height);ctx.fillStyle=nameplateFill(f.bot);ctx.beginPath();ctx.roundRect(4,3,504,106,18);ctx.fill();ctx.font='700 44px Segoe UI, Arial';ctx.textAlign='center';ctx.fillStyle='#456042';const name=window.TuatEngine.tuat(f.name);drawName(ctx,name,256,47,480);ctx.fillStyle='#d7dbc2';ctx.fillRect(27,65,458,11);ctx.fillStyle=f.team==='left'?'#d36a50':'#438f9d';ctx.fillRect(27,65,458*f.hp/f.maxHp,11);ctx.font='22px Segoe UI';ctx.fillStyle='#7f9070';ctx.fillText(f.hp?`${f.hp}/${f.maxHp}${cooldown!==null?' · '+(f.form==='dragon'?'LỬA ':'CÀO ')+cooldown+'s':''}`:'ĐÃ GỤC · CHỜ HỒI SINH',256,101,475);u.label.material.map.needsUpdate=true;u.label.material.opacity=f.hp?1:.7;u.ring.material.opacity=f.hp?.7:.18;}
 clearUnitEffects(u){for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];if(e.caster===u||e.recipient===u){this.disposeEffect(e);this.effects.splice(i,1);}}}
 resizeLabel(u,height){if(u.labelCanvas.height===height)return;u.label.material.map.dispose();u.labelCanvas.height=height;const texture=new THREE.CanvasTexture(u.labelCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;u.label.material.map=texture;}
 releaseVisual(u){if(!this.visualPool||this.pooledVisuals>=20){this.dispose(u);return;}this.clearUnitEffects(u);u.root.removeFromParent();u.mixer?.stopAllAction();u.naturalJaw?.update(0);const pool=this.visualPool.get(u.key)||[];pool.push(u);this.visualPool.set(u.key,pool);this.pooledVisuals++;}
 dispose(u){
  for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];if(e.caster!==u&&e.recipient!==u)continue;this.disposeEffect(e);this.effects.splice(i,1);}
  u.root.removeFromParent();const skeletons=new Set();u.visual?.traverse(m=>{if(m.isSkinnedMesh)skeletons.add(m.skeleton);});for(const skeleton of skeletons)skeleton.dispose();if(u.mixer){u.mixer.stopAllAction();u.mixer.uncacheRoot(u.visual);}u.label.material.map.dispose();u.label.material.dispose();u.ring.geometry.dispose();u.ring.material.dispose();
  if(u.naturalJaw){u.naturalJaw.owned.forEach(g=>g.dispose());u.naturalJaw.liningMaterial.dispose();}
  if(u.dragon){const gs=new Set(),ms=new Set();u.dragon.root.traverse(m=>{if(m.geometry)gs.add(m.geometry);if(m.material)ms.add(m.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
  this.resourceDisposals++;
 }
 wave(u){if(Date.now()-(u.lastWaveAt??-Infinity)<450||this.effects.length>60)return;u.lastWaveAt=Date.now();const mesh=new THREE.Mesh(new THREE.RingGeometry(.3,.42,40),new THREE.MeshBasicMaterial({color:u.team==='left'?'#eebf6c':'#9ddcc5',transparent:true,opacity:.8,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(u.root.position);mesh.position.y=.16;this.group.add(mesh);this.effects.push({mesh,time:0});}
 barkEffect(event){
  const u=this.shotUnit(event.actor),target=this.shotUnit(event.target);if(!u||!event.physical&&(this.effects.length>60||this.effects.some(e=>e.type==='voice'&&e.caster===u)))return;
  const form=event.actorForm||u.form,start=this.mouthPosition(u);
  // A stale skill event must never make a replacement dog/model breathe fire.
  if(event.physical&&(event.kind!=='skill'||u.form!==form||!target||target.team===u.team||!this.units.has(event.actor)||!this.units.has(event.target)||(form==='dragon'&&(!u.dragon||u.key!=='dragon'))))return;
  if(target)target.root.updateWorldMatrix(true,false);const end=target?target.root.localToWorld(new THREE.Vector3(0,target.height*.55,0)):start.clone().add(new THREE.Vector3(u.team==='left'?2:-2,0,0)),direction=end.clone().sub(start).normalize();
  const add=(geometry,color,type,life,position)=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false}));if(position)mesh.position.copy(position);this.group.add(mesh);const effect={mesh,time:0,type,life};this.effects.push(effect);return effect;};
  // Sound is represented by expanding curved strokes; it does not alter the audio mix.
  if(!event.physical||form==='tiger')for(let i=0;i<3;i++){const e=add(new THREE.RingGeometry(.47,.5,64),'#ffffff','voice',.95,start.clone());e.mesh.material.depthTest=false;e.caster=u;e.delay=.06+i*.13;e.mesh.quaternion.copy(this.camera.quaternion);e.direction=direction;e.anchor=u.soundAnchor||u.mouthAnchor;e.offset=.08+i*.12;e.unitScale=u.root.scale.x;}
  if(!event.physical||!target)return;target.root.updateWorldMatrix(true,false);
  if(form==='dragon'){
   for(const effect of fireEffects(start,end)){
    effect.caster=u;effect.recipient=target;const update=effect.update;
    effect.update=(...args)=>{effect.curve.v1.copy(this.mouthPosition(u));target.root.updateWorldMatrix(true,false);effect.curve.v2.copy(target.root.localToWorld(new THREE.Vector3(0,target.height*.55,0)));effect.target.copy(effect.curve.v2);update(...args);};
    this.group.add(effect.mesh);this.effects.push(effect);
   }
  }else if(form==='tiger'){
   u.attackDuration=1000;u.attackUntil=event.at+1000;u.strikeDirection=target.base.clone().sub(u.base).setY(0).normalize();target.hurtAt=event.at;target.hurtUntil=event.at+650;target.hurtDirection=u.strikeDirection.clone();
   for(const effect of clawEffects(end)){effect.caster=u;effect.recipient=target;const update=effect.update;effect.update=(...args)=>{target.root.updateWorldMatrix(true,false);effect.target.copy(target.root.localToWorld(new THREE.Vector3(0,target.height*.6,0)));effect.mesh.position.copy(effect.target);update(...args);};this.group.add(effect.mesh);this.effects.push(effect);}
   this.damageBadge(target,event.damage,u);

  }
 }
 damageBadge(target,damage,caster,{text=`−${damage} HP`,color='#fff1ba',type='damage'}={}){
  const c=document.createElement('canvas');c.width=320;c.height=112;const ctx=c.getContext('2d');ctx.font='900 72px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=12;ctx.strokeStyle='#6a2118';ctx.strokeText(text,160,55);ctx.fillStyle=color;ctx.fillText(text,160,55);const texture=new THREE.CanvasTexture(c),mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.91),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}));mesh.renderOrder=25;this.group.add(mesh);this.effects.push({mesh,type,time:0,life:1.9,caster,recipient:target,update(dt,time,camera){mesh.position.copy(target.root.position);mesh.position.y+=target.height+.85+time*.45;mesh.quaternion.copy(camera.quaternion);mesh.material.opacity=Math.min(1,(1.9-time)/.5);},dispose(){mesh.geometry.dispose();texture.dispose();mesh.material.dispose();}});
 }
 disposeEffect(e){e.mesh.removeFromParent();if(e.dispose)e.dispose();else{e.mesh.geometry?.dispose();e.mesh.material.dispose();}}
 giftEffect(event){
  if(!this.group)return;const kind=event.gift,cheer=['rose','cake','support'].includes(kind),targets=(event.targets||[]).map(id=>this.shotUnit(id)).filter(Boolean),donor=this.shotUnit(event.personId),units=cheer?[null]:targets.length?targets:donor?[donor]:[],applied=!['heal','revive'].includes(kind)||targets.length>0,color=cheer?(event.team==='left'?'#ec7961':'#7bcfe0'):!applied?'#e1c788':kind==='heal'?'#86f0ab':kind==='revive'?'#a8e7ff':kind==='dragon'?'#89e2bd':'#f3d479';
  for(const u of units){const position=u?u.root.position.clone():new THREE.Vector3(event.team==='left'?-2.55:2.55,.15,2),mesh=new THREE.Mesh(new THREE.RingGeometry(cheer?1.6:.65,cheer?1.72:.73,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(position);mesh.position.y=.2;this.group.add(mesh);this.effects.push({mesh,type:'gift-aura',time:0,life:1.4,recipient:u,update(dt,time){mesh.scale.setScalar(1+time*.45);mesh.material.opacity=Math.max(0,.85*(1-time/1.4));}});if(u&&applied&&['heal','revive'].includes(kind))this.damageBadge(u,0,null,{text:kind==='revive'?'↑ HỒI SINH':event.healedHp?`+${event.healedHp} HP`:'HỒI HP',color,type:'gift-badge'});}
 }
 sync(s){
  const fighters=window.TuatEngine.sceneRoster(s).fighters;
  const ids=new Set(fighters.map(f=>f.id));for(const [id,u] of this.units)if(!ids.has(id)){this.releaseVisual(u);this.units.delete(id);}
  for(const f of fighters){let u=this.units.get(f.id),key=f.form==='dog'?f.breed:f.form;if(!u||u.key!==key||u.team!==f.team||u.slot!==f.slot){if(u)this.releaseVisual(u);u=this.visual(f);u.slot=f.slot;this.units.set(f.id,u);}u.fighter=f;u.root.scale.setScalar(s.config.modelScale||1);this.label(u,f);
   if(f.hp===0&&u.clip!=='dead')this.play(u,'dead');else if(f.hp>0){if(u.clip==='dead')this.play(u,'idle');if(s.phase==='battle'&&!s.paused){if(f.barkAt>(u.lastBark||0)){u.lastBark=f.barkAt;if(Date.now()-f.barkAt<1500){this.startBark(u,f.barkAt);this.wave(u);}}if(f.form!=='dog'&&f.attackAt>u.lastAttack){u.lastAttack=f.attackAt;if(Date.now()-f.attackAt<1500){this.play(u,'attack');u.attackDuration=f.form==='tiger'?1000:800;u.attackUntil=f.attackAt+u.attackDuration;}}}}
  }
  this.syncSpectators(s);
  if(this.broadcast){const view=window.TuatEngine.sceneRoster(s);this.broadcast.dataset.arenaUnits=String(this.units.size);this.broadcast.dataset.visibleBots=String([...view.fighters,...view.waiting].filter(f=>f.bot).length);this.broadcast.dataset.visiblePeople=String([...view.fighters,...view.waiting].filter(f=>!f.bot).length);}
 }
 syncSpectators(s){
  const waiting=window.TuatEngine.sceneRoster(s).waiting.slice().sort((a,b)=>a.joinedAt-b.joinedAt||a.id.localeCompare(b.id)),layout=crowdLayout(waiting.length),upgraded=waiting.filter(p=>Date.now()-(p.formChangedAt||0)<6000).map(p=>({id:p.id,until:p.formChangedAt+6000})),featuredIds=[this.featured,this.barkFeatured,...upgraded,...(this.chatBubbles?.values()||[])].filter(f=>f?.until>Date.now()).map(f=>f.personId||f.id),detailIds=new Set([...featuredIds,...waiting.map(p=>p.id)].slice(0,8)),people=waiting.filter(p=>detailIds.has(p.id));
  if(!this.crowd)this.crowd=new BakedCrowd(this.group,key=>{const f={id:'crowd-template',name:'',team:null,slot:0,breed:key==='tiger'||key==='dragon'?'shiba':key,form:key==='tiger'||key==='dragon'?key:'dog',hp:200,maxHp:200},u=this.visual(f),parts=bakeCrowdParts(u.root,new Set([u.ring]));this.dispose(u);return parts;});
  const locations=new Map(waiting.map((p,i)=>[p.id,layout[i]]));this.crowd.set(waiting.filter(p=>!detailIds.has(p.id)).map(p=>({id:p.id,key:window.TuatEngine.modelFor(p),barkAt:p.barkSignal?.at||0,barkTotal:p.barkSignal?.countTotal||0,interactive:['like','comment'].includes(p.barkSignal?.source),...locations.get(p.id)})));
  this.crowdLabels||=new CrowdLabels(this.group);this.crowdLabels.set(waiting.filter(p=>!detailIds.has(p.id)).map(p=>{const key=window.TuatEngine.modelFor(p);return{id:p.id,name:window.TuatEngine.tuat(p.name),bot:!!p.bot,height:key==='dragon'?2.32:heights[key]||1.6,...locations.get(p.id)};}));
  if(this.broadcast){this.broadcast.dataset.spectatorLabels=String(this.crowdLabels.count+people.length);for(const zone of ['left','right','front'])this.broadcast.dataset['crowd'+zone[0].toUpperCase()+zone.slice(1)]=String(layout.filter(p=>p.zone===zone).length);}
  const ids=new Set(people.map(p=>p.id));for(const [id,u] of this.spectators)if(!ids.has(id)){this.releaseVisual(u);this.spectators.delete(id);}
  people.forEach((p,i)=>{let u=this.spectators.get(p.id);const model=window.TuatEngine.modelFor(p),breed=window.TuatEngine.fixedBreed(p),form=['tiger','dragon'].includes(model)?model:'dog';if(u&&(u.form!==form||u.team!==p.team||u.fighter.breed!==breed)){this.releaseVisual(u);this.spectators.delete(p.id);u=null;}if(!u){const f={id:p.id,name:p.name,team:p.team,slot:0,breed,form,hp:200,maxHp:200};u=this.visual(f);u.fighter=f;u.spectator=true;u.visual?.traverse?.(m=>{if(m.isMesh)m.castShadow=false;});u.ring.visible=false;this.resizeLabel(u,128);this.spectators.set(p.id,u);}
   const {x,z,scale,yaw}=locations.get(p.id);u.base.set(x,.15,z);u.root.position.copy(u.base);u.root.rotation.y=yaw;u.root.scale.setScalar(scale);u.label.scale.set(NAMEPLATE_WIDTH/scale,NAMEPLATE_HEIGHT/scale,1);
   const key=p.name+'|'+p.bot;if(u.waitKey!==key){u.waitKey=key;const ctx=u.labelCanvas.getContext('2d');ctx.clearRect(0,0,512,128);ctx.fillStyle=nameplateFill(p.bot);ctx.beginPath();ctx.roundRect(4,4,504,120,14);ctx.fill();ctx.textAlign='center';ctx.fillStyle='#456042';ctx.font='700 52px Segoe UI, Arial, sans-serif';drawName(ctx,window.TuatEngine.tuat(p.name),256,82,475);u.label.material.map.generateMipmaps=false;u.label.material.map.minFilter=THREE.LinearFilter;u.label.material.map.needsUpdate=true;}
  });
 }
 heart(event){
  const u=this.units.get(event.personId)||this.spectators.get(event.personId);if(!u||Date.now()-(u.lastHeart||0)<900||this.effects.length>24)return;u.lastHeart=Date.now();
  if(!this.heartTexture){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#ed6e86';g.beginPath();g.moveTo(64,111);g.bezierCurveTo(-15,55,15,-5,64,34);g.bezierCurveTo(113,-5,143,55,64,111);g.fill();this.heartTexture=new THREE.CanvasTexture(c);this.heartTexture.colorSpace=THREE.SRGBColorSpace;}
  const mesh=new THREE.Sprite(new THREE.SpriteMaterial({map:this.heartTexture,transparent:true,depthTest:false}));mesh.position.copy(u.root.position);mesh.position.y+=u.height+1;mesh.scale.setScalar(.7);mesh.renderOrder=12;this.group.add(mesh);this.effects.push({mesh,time:0,type:'heart'});
 }
 syncChats(s,now){
  if(!this.chatLayer)return;
  const recent=s.people.filter(p=>p.chat?.text&&p.chat.at<=now&&now-p.chat.at<4500).sort((a,b)=>b.chat.at-a.chat.at||a.id.localeCompare(b.id)).slice(0,6),ids=new Set(recent.map(p=>p.id));
  for(const [id,b] of this.chatBubbles)if(!ids.has(id)){b.element.remove();this.chatBubbles.delete(id);}
  for(const p of recent){let b=this.chatBubbles.get(p.id);if(!b){const element=document.createElement('div'),text=document.createElement('span');element.className='tuat-chat';element.dataset.chatUser=p.id;element.append(text);this.chatLayer.append(element);b={element,text,personId:p.id};this.chatBubbles.set(p.id,b);}
   if(b.messageId!==p.chat.id){b.messageId=p.chat.id;b.text.textContent=p.chat.text;b.element.setAttribute('aria-label',`${window.TuatEngine.tuat(p.name)}: ${p.chat.text}`);b.width=null;b.height=null;}b.until=p.chat.at+4500;
  }
 }
 positionChats(wall){
  if(!this.chatLayer||!this.chatBubbles.size)return;this.camera.updateMatrixWorld();
  for(const [id,b] of this.chatBubbles){if(wall>=b.until){b.element.remove();this.chatBubbles.delete(id);continue;}
   const u=this.shotUnit(id);if(!u){b.element.hidden=true;continue;}u.root.updateWorldMatrix(true,false);
   const point=u.root.localToWorld(new THREE.Vector3(0,u.height+.5,0));point.y+=.65;point.project(this.camera);
   const visible=Math.abs(point.x)<1.06&&Math.abs(point.y)<1.06&&point.z>-1&&point.z<1;b.element.hidden=!visible;if(!visible)continue;
   b.width||=b.element.offsetWidth;b.height||=b.element.offsetHeight;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
   b.element.style.left=THREE.MathUtils.clamp((point.x+1)*w/2,b.width/2+12,w-b.width/2-12)+'px';b.element.style.top=THREE.MathUtils.clamp((1-point.y)*h/2,b.height+12,h-18)+'px';b.element.style.opacity=String(Math.min(1,(b.until-wall)/400));
  }
 }
 startShot(shot){
  if(!shot)return;const e=shot.event;
  if(this.startedShotId===shot.id){this.reframeFrom={eye:this.camera.position.clone(),focus:this.cameraFocus.clone(),zoom:this.camera.zoom,at:Date.now()};this.shotPose=null;return;}this.startedShotId=shot.id;this.reframeFrom=null;
  if(e.personId)this.featured={id:e.personId,until:shot.ends+1000};
  this.returnFrom=null;this.shotFrom={eye:this.camera.position.clone(),focus:this.cameraFocus?.clone()||new THREE.Vector3(0,0,3),zoom:this.camera.zoom};this.shotPose=null;this.captionKey=null;
 }
 speechPlayback(message){
  const now=Date.now();
  if(message.phase==='end'){
   if(this.pendingSpeech?.id===message.id)this.pendingSpeech=null;
   const shot=this.director.active;if(shot?.speechId!==message.id||shot.speechEnded)return;shot.speechEnded=true;
   if(message.completed){shot.ends=Math.max(now+850,...(shot.skillEvents||[]).map(e=>e.at+4200));shot.duration=shot.ends-shot.start;this.director.wideUntil=shot.ends+1400;}else this.returnToOverview(now);
   return;
  }
  const scene=message.presentation||(message.welcome?{kind:'welcome',event:message.welcome}:null);
  if(message.phase!=='start'||!['welcome','gift'].includes(scene?.kind)||!scene.event?.personId||!Number.isFinite(message.duration))return;
  this.seenSpeech||=new Set();if(this.seenSpeech.has(message.id))return;
  const remaining=message.duration-Math.max(0,now-message.startedAt)/1000;if(remaining<=0){if(this.pendingSpeech?.id===message.id)this.pendingSpeech=null;return;}
  if(!this.ready||!this.state){this.pendingSpeech=message;return;}
  if(this.inspector||this.state.phase==='prepare'||this.state.config.cameraEnabled===false||this.reducedMotion)return;
  const personId=scene.event.personId;if(!this.state.people.some(p=>p.id===personId)&&!this.state.fighters?.some(f=>f.id===personId)){this.pendingSpeech=message;return;}
  this.pendingSpeech=null;this.seenSpeech.add(message.id);if(this.seenSpeech.size>100)this.seenSpeech.delete(this.seenSpeech.values().next().value);
  // Decide once at actual speech onset. Changing audience size cannot replay this shot.
  if(scene.kind==='welcome'&&(message.welcomeMode||window.TuatBroadcast.welcomeMode(this.state))==='banner')return;
  const shot=this.director.spokenPresentation(scene.kind,scene.event,now,remaining,message.id);this.startShot(shot);this.sync(this.state);
 }
 returnToOverview(now){
  this.returnFrom={eye:this.camera.position.clone(),focus:this.cameraFocus?.clone()||new THREE.Vector3(0,0,3),zoom:this.camera.zoom,at:now};
  this.director.reset();this.shotPose=null;this.featured=null;
 }
 previewShot(kind,strength){
  if(!this.ready||!this.state||kind!=='orbit')return;
  const shot=this.director.request('orbit',{},Date.now(),true);shot.strength=THREE.MathUtils.clamp(Number(strength)||1,.65,1.25);this.startShot(shot);
 }
 shotUnit(id){return this.units.get(id)||this.spectators.get(id);}
 makeShotPose(shot){
  if(shot.kind==='orbit')return{focus:new THREE.Vector3(0,1.2,2),zoom:shot.zoom};
  const e=shot.event,first=this.shotUnit(e.targets?.[0]||e.actor||e.personId),donor=this.shotUnit(e.personId),u=shot.kind==='welcome'?donor:shot.kind==='gift'?(donor||first):first,team=e.team||u?.team||'left',side=team==='left'?1:-1,focus=u?u.base.clone():new THREE.Vector3(-side*2.5,.1,3),other=this.shotUnit(e.target);let zoom=shot.zoom,angle=side*1.04;
  if(e.physical&&other&&u){focus.add(other.base).multiplyScalar(.5);angle=side*.38;zoom=Math.min(zoom,26/(Math.abs(other.base.z-u.base.z)+6));}
  if(shot.kind==='gift'&&!donor){focus.set(-side*2.5,.1,3);zoom=1.6;angle=side*.15;}
  if(e.physical&&e.actorForm==='tiger'&&other){focus.lerp(other.base,.28);zoom=Math.min(zoom,2.2);}
  focus.y+=(e.physical&&e.actorForm==='tiger'?other?.height:u?.height||1.7)*.5;
  if(u&&!this.reducedMotion&&this.burstShotId!==shot.id){this.shotBurst(u,shot.kind,e.gift);this.burstShotId=shot.id;}
  if(shot.skillEvents?.length){
   angle=side*.12; // Face the court so side signs cannot hide the skill's victim.
   const ids=new Set([u?.fighter?.id,...shot.skillEvents.flatMap(e=>[e.actor,e.target])]),units=[...ids].map(id=>this.shotUnit(id)).filter(Boolean);
   if(units.length){
    const bounds=new THREE.Box3();for(const unit of units){bounds.expandByPoint(unit.base.clone().add(new THREE.Vector3(-1.5,0,-1.5)));bounds.expandByPoint(unit.base.clone().add(new THREE.Vector3(1.5,unit.height+1,1.5)));}bounds.getCenter(focus);
    const forward=new THREE.Vector3(-Math.sin(angle)*22,-13.5,-Math.cos(angle)*22).normalize(),right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,forward);let x=0,y=0;
    for(const a of [bounds.min.x,bounds.max.x])for(const b of [bounds.min.y,bounds.max.y])for(const c of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(a,b,c).sub(focus);x=Math.max(x,Math.abs(p.dot(right)));y=Math.max(y,Math.abs(p.dot(up)));}
    return{focus,zoom,angle,maxZoom:Math.min(this.camera.right*.88/Math.max(.1,x),this.camera.top*.88/Math.max(.1,y))};
   }
  }
  return{focus,zoom,angle};
 }
 shotBurst(u,kind,gift){
  if(this.effects.length>30)return;const color=kind==='welcome'?'#f0d59b':gift==='execute'?'#ebbc72':['heal','revive','dragon'].includes(gift)?'#81cba0':'#efc470';
  const ring=new THREE.Mesh(new THREE.RingGeometry(.75,.87,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.copy(u.base);ring.position.y=.18;this.group.add(ring);this.effects.push({mesh:ring,time:0,type:'aura',life:2.8});
  for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.07,0),new THREE.MeshBasicMaterial({color,transparent:true})),a=i/8*Math.PI*2;m.position.copy(u.base);m.position.y+=.35;m.position.x+=Math.cos(a)*.75;m.position.z+=Math.sin(a)*.75;this.group.add(m);this.effects.push({mesh:m,time:0,type:'spark',life:2.4,speed:.65+i%3*.22});}
 }
 orbitZoom(eye,focus,desired){
  if(!this.units.size)return desired;
  const forward=focus.clone().sub(eye).normalize(),right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,forward),point=new THREE.Vector3();let x=0,y=0;
  for(const u of this.units.values())for(const dx of [-1.25,1.25])for(const dy of [0,Math.max(3.5,u.height+1)])for(const dz of [-1.25,1.25]){point.set(u.base.x+dx,dy,u.base.z+dz).sub(focus);x=Math.max(x,Math.abs(point.dot(right)));y=Math.max(y,Math.abs(point.dot(up)));}
  return Math.min(desired,this.camera.right*.9/Math.max(.1,x),this.camera.top*.9/Math.max(.1,y));
 }
 updateCamera(wall){
  const shot=this.director.sample(wall);
  if(shot&&!this.shotPose)this.shotPose=this.makeShotPose(shot);
  const pose=shot&&this.shotPose;
  const {focus,eye}=this.overviewPose();
  let zoom=1;
  if(pose&&shot.kind==='orbit'){
   const travel=THREE.MathUtils.smootherstep(shot.progress,0,1),angle=shot.direction*THREE.MathUtils.lerp(-.36,.36,travel),shotEye=pose.focus.clone().add(new THREE.Vector3(Math.sin(angle)*25,12.5,Math.cos(angle)*25)),enter=THREE.MathUtils.smootherstep(wall-shot.start,0,1200),exit=1-THREE.MathUtils.smootherstep(shot.ends-wall,0,1400),from=this.shotFrom||{eye:eye.clone(),focus:focus.clone(),zoom:1},wideEye=eye.clone(),wideFocus=focus.clone(),desired=1+(pose.zoom-1)*THREE.MathUtils.clamp(Number(shot.manual?shot.strength:this.state?.config.cameraStrength)||1,.65,1.25),closeZoom=this.orbitZoom(shotEye,pose.focus,desired);
   focus.lerpVectors(from.focus,pose.focus,enter).lerp(wideFocus,exit);eye.lerpVectors(from.eye,shotEye,enter).lerp(wideEye,exit);zoom=THREE.MathUtils.lerp(THREE.MathUtils.lerp(from.zoom,closeZoom,enter),1,exit);
  }
  if(pose&&shot.kind!=='orbit'){
   const angle=pose.angle+Math.sin(shot.progress*Math.PI)*.08,shotEye=pose.focus.clone().add(new THREE.Vector3(Math.sin(angle)*22,13.5,Math.cos(angle)*22)),enter=THREE.MathUtils.smoothstep(wall-shot.start,0,650),exit=1-THREE.MathUtils.smoothstep(shot.ends-wall,0,850),from=this.shotFrom||{eye:eye.clone(),focus:focus.clone(),zoom:1},wideEye=eye.clone(),wideFocus=focus.clone();focus.lerpVectors(from.focus,pose.focus,enter).lerp(wideFocus,exit);eye.lerpVectors(from.eye,shotEye,enter).lerp(wideEye,exit);zoom=THREE.MathUtils.lerp(THREE.MathUtils.lerp(from.zoom,Math.min(pose.maxZoom??Infinity,1+(pose.zoom-1)*THREE.MathUtils.clamp(Number(shot.manual?shot.strength:this.state?.config.cameraStrength)||1,.65,1.25)),enter),1,exit);
  }
  if(pose&&this.reframeFrom){const from=this.reframeFrom,amount=THREE.MathUtils.smoothstep(wall-from.at,0,650);eye.lerpVectors(from.eye,eye.clone(),amount);focus.lerpVectors(from.focus,focus.clone(),amount);zoom=THREE.MathUtils.lerp(from.zoom,zoom,amount);if(amount===1)this.reframeFrom=null;}
  if(!shot&&this.returnFrom){const from=this.returnFrom,amount=THREE.MathUtils.smoothstep(wall-from.at,0,650),wideEye=eye.clone(),wideFocus=focus.clone();eye.lerpVectors(from.eye,wideEye,amount);focus.lerpVectors(from.focus,wideFocus,amount);zoom=THREE.MathUtils.lerp(from.zoom,1,amount);if(amount===1)this.returnFrom=null;}
  this.cameraFocus=focus;this.camera.position.copy(eye);this.camera.lookAt(focus);if(Math.abs(this.camera.zoom-zoom)>.0001){this.camera.zoom=zoom;this.camera.updateProjectionMatrix();}
  if(this.broadcast){if(pose)this.broadcast.dataset.cameraShot=shot.kind;else delete this.broadcast.dataset.cameraShot;this.broadcast.dataset.cameraNextAt=String(this.director.nextAt||'');}
  if(!shot)this.shotPose=null;
 }
 update(s){this.state=s;if(this.broadcast){const due=Math.min(...(s.fighters||[]).filter(f=>f.hp>0&&f.form==='tiger').map(f=>f.skillReadyAt||Infinity));this.broadcast.dataset.skillDueAt=Number.isFinite(due)?String(due):'';}if(this.ready&&!this.inspector){const now=Date.now(),sceneKey=`${s.phase}:${s.round}`,changed=this.sceneKey!==undefined&&this.sceneKey!==sceneKey;this.sceneKey=sceneKey;
  if(changed){if(this.director.active||this.returnFrom)this.returnToOverview(now);else this.director.reset();}
  const active=this.director.active,shot=this.director.consume(s,now,{reducedMotion:this.reducedMotion,deferWelcomes:s.welcomeSpeechEnabled===true,deferGifts:s.giftSpeechEnabled===true,minSpeakCoins:s.giftSpeechMinCoins??1});if(active&&!this.director.active)this.returnToOverview(now);this.startShot(shot);
  // Bootstrap without replaying old barks after loading/reloading an overlay.
  this.seenSocial||=new Set(s.events.map(e=>e.id));const signaled=new Set([...(s.people||[]),...(s.fighters||[])].filter(u=>u.barkSignal).map(u=>u.id)),cues=window.TuatEngine.barkCues(s,this.barkCursor||={},now),fresh=[...s.events.filter(e=>!this.seenSocial.has(e.id)&&now-e.at>=0&&now-e.at<2000&&!(e.kind==='bark'&&signaled.has(e.actor))),...cues];
  if(cues.length&&this.broadcast){this.cueActors||=new Set();this.cueLatencies||=[];for(const c of cues)if(c.interactiveCount>0){this.cueActors.add(c.actor);this.cueHearts=(this.cueHearts||0)+c.interactiveCount;this.cueLatencies.push(now-c.at);}this.cueLatencies=this.cueLatencies.slice(-1000);const lat=this.cueLatencies.slice().sort((a,b)=>a-b);this.broadcast.dataset.cueHearts=String(this.cueHearts||0);this.broadcast.dataset.cueActors=String(this.cueActors.size);this.broadcast.dataset.cueLatencyP95=String(lat[Math.floor(lat.length*.95)]||0);}
  const cheering=fresh.filter(e=>e.kind==='bark'&&e.spectator).at(-1);if(cheering&&(!this.barkFeatured||this.barkFeatured.until<=now||this.barkFeatured.id===cheering.actor))this.barkFeatured={id:cheering.actor,until:now+2000};
  this.syncChats(s,now);this.sync(s);if(this.pendingSpeech)this.speechPlayback(this.pendingSpeech);for(const event of fresh){if(event.kind==='gift')this.giftEffect(event);if(event.kind==='like')this.heart(event);if(event.kind==='bark'&&event.source==='like')this.heart({personId:event.actor});if(['bark','skill'].includes(event.kind)&&!s.paused){this.barkEffect(event);if(event.kind==='bark'){const u=this.shotUnit(event.actor);if(u){this.startBark(u,event.at,event.count||1,event.source==='like'||event.source==='comment');if(event.spectator&&this.effects.length<32)this.wave(u);}}}}
  for(const event of s.events)this.seenSocial.add(event.id);if(this.seenSocial.size>200)this.seenSocial=new Set(s.events.map(e=>e.id));}}
 frame(now){if(!this.renderer||!this.camera)return;const interval=this.isPreview?1000/15:1000/30;if(this.isPreview&&document.hidden||now-this.lastDraw<interval-.5)return;this.lastDraw=now;const dt=Math.min(.05,Math.max(0,(now-this.previous)/1000));this.previous=now;if(!this.active)return;this.elapsed+=dt;const wall=Date.now(),t=this.elapsed,frameStart=performance.now();this.crowd?.update(wall);if(this.state&&!this.inspector)this.world.update(this.state,wall);
  for(const u of [...this.units.values(),...this.spectators.values()]){
   const moving=this.state?.phase==='battle'&&!this.state.paused;
   if(u.mixer)u.mixer.update(!this.inspector&&!u.spectator&&this.state?.paused?0:dt);
   if(u.barking&&wall>u.barkUntil){u.barkAction?.fadeOut(.1);u.barking=false;}if(!this.inspector&&u.fighter.hp>0&&u.clip==='attack'&&wall>u.attackUntil)this.play(u,'idle');
   const barkPhase=((wall-(u.barkStartedAt||wall))% (u.barkCycle||420))/(u.barkCycle||420),barkPulse=u.fighter.hp>0&&u.barkUntil>wall?Math.sin(barkPhase*Math.PI)*Math.min(1,(u.barkUntil-wall)/120):0;u.root.position.copy(u.base);if(u.lean)applyGroundedBark(u.lean,u.form==='dog'?barkPulse:0);if(u.headBone&&barkPulse>0)u.headBone.rotateX(barkPulse*.04);u.naturalJaw?.update(barkPulse);if(!this.inspector&&moving&&u.form!=='dog'&&u.attackUntil>wall){const pulse=Math.sin((u.attackUntil-wall)/(u.attackDuration||800)*Math.PI);if(u.form==='tiger'&&u.strikeDirection)u.root.position.addScaledVector(u.strikeDirection,pulse*.48);else u.root.position.x+=pulse*.3*(u.team==='left'?1:-1);}
   if(!this.inspector&&u.hurtUntil>wall&&u.hurtDirection)u.root.position.addScaledVector(u.hurtDirection,Math.sin((wall-u.hurtAt)/650*Math.PI)*.22);
   if(u.dragon){u.dragon.body.position.y=u.fighter.hp>0?Math.sin(t*2.2)*.06:0;u.dragon.body.rotation.z=u.fighter.hp>0?Math.sin(t*1.7)*.035:Math.PI*.45;u.dragon.head.rotation.x=(u.clip==='attack'||u.barkUntil>wall)?Math.sin(t*18)*.15:Math.sin(t*2)*.03;u.dragon.jaw.rotation.x=(u.clip==='attack'||u.barkUntil>wall)?.35+Math.sin(t*20)*.12:0;}
  }
  for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.time+=dt;const life=e.life||.8;if(e.update){e.update(dt,e.time,this.camera,this.renderer);}else if(e.type==='heart'){e.mesh.position.y+=dt*1.5;e.mesh.scale.setScalar(.7+e.time*.2);}else if(e.type==='spark'){e.mesh.position.y+=dt*e.speed;e.mesh.rotation.y+=dt*2;e.mesh.rotation.z+=dt;}else if(e.type==='voice'){const age=Math.max(0,e.time-(e.delay||0));if(e.anchor){e.anchor.updateWorldMatrix(true,false);e.mesh.position.copy(e.anchor.getWorldPosition(new THREE.Vector3())).addScaledVector(e.direction,(e.offset+age*.55)*(e.unitScale||1));}else e.mesh.position.addScaledVector(e.direction,dt*.5);e.mesh.quaternion.copy(this.camera.quaternion);e.mesh.scale.setScalar((.2+age*1.5)*(e.unitScale||1));}else if(e.type==='fire'||e.type==='claw'){e.mesh.geometry.setDrawRange(0,Math.floor(e.mesh.geometry.index.count*Math.min(1,e.time/(e.type==='fire'?.24:.14))/3)*3);}else if(e.type==='flame'){e.mesh.position.copy(e.curve.getPoint(THREE.MathUtils.clamp((e.time-e.delay)/.42,0,1)));e.mesh.scale.setScalar(.8+Math.sin(e.time*28)*.25);e.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),e.curve.getTangent(THREE.MathUtils.clamp((e.time-e.delay)/.42,0,1)).normalize());}else e.mesh.scale.setScalar(1+e.time*(e.type==='aura'?.35:4));if(!e.update)e.mesh.material.opacity=e.type==='voice'&&e.time<e.delay?0:Math.max(0,.9*(1-e.time/life));if(e.time>life){if(e.type==='heart'){e.mesh.removeFromParent();e.mesh.material.dispose();}else this.disposeEffect(e);this.effects.splice(i,1);}}
  if(!this.inspector){this.updateCamera(wall);this.positionChats(wall);if(this.broadcast){const fx=[...new Set(this.effects.filter(e=>e.time>.2).map(e=>e.type).filter(t=>['voice','fire','claw','damage'].includes(t)))].sort().join(' ');if(this.broadcast.dataset.visualFx!==fx)this.broadcast.dataset.visualFx=fx;}}
  if(this.renderer.shadowMap&&now-(this.lastShadowAt||0)>=66){this.lastShadowAt=now;this.renderer.shadowMap.needsUpdate=true;}this.renderer.render(this.scene,this.camera);this.lastPresentedAt=Date.now();
  this.frameSamples||=[];this.frameSamples.push({at:now,cpu:performance.now()-frameStart});while(this.frameSamples[0]?.at<now-5000)this.frameSamples.shift();if(this.broadcast&&now-(this.lastPerfAt||0)>500){this.lastPerfAt=now;const a=this.frameSamples,cpu=a.map(v=>v.cpu).sort((a,b)=>a-b);this.broadcast.dataset.renderFps=String(Math.round((a.length-1)*10000/Math.max(1,now-a[0].at))/10);this.broadcast.dataset.frameCpuP95=String(Math.round((cpu[Math.floor(cpu.length*.95)]||0)*10)/10);this.broadcast.dataset.barking=String([...this.units.values(),...this.spectators.values()].filter(u=>u.barkUntil>wall).length);}
 }
 info(){return{engine:'Three.js/WebGL2',ready:this.ready,error:this.error,models:this.library.size,units:this.units.size,spectators:this.spectators.size+(this.crowd?.count||0),detailedSpectators:this.spectators.size,batchedSpectators:this.crowd?.count||0,inspector:this.inspector,previewClip:this.units.get('model-preview')?.clip,roof:this.world?.metrics||null,forms:[...this.units.values()].map(u=>u.form),triangles:this.renderer?.info.render.triangles,drawCalls:this.renderer?.info.render.calls,disposed:this.resourceDisposals,pooledVisuals:this.pooledVisuals||0,embedded:true};}
}
window.TuatCanvas=Tuat3DCanvas;
