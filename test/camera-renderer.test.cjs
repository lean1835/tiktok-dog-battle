const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),esbuild=require('esbuild'),E=require('../src/live-engine.js');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/live-renderer-3d.js'),'utf8').replace('__MODEL_DATA__','{}');
const code=esbuild.buildSync({stdin:{contents:source,resolveDir:path.join(root,'src'),loader:'js'},bundle:true,format:'cjs',platform:'node',external:['three'],write:false}).outputFiles[0].text;
function fixture({waitingOnly=false}={}){
 let now=10000;const sandbox={window:{TuatEngine:E,TuatBroadcast:require('../src/live-broadcast.js')},document:{createElement:()=>({getContext:()=>({strokeText(){},fillText(){}}),children:[],dataset:{},style:{},offsetWidth:120,offsetHeight:44,append(child){this.children.push(child);},setAttribute(k,v){this[k]=v;},remove(){this.removed=true;},set innerHTML(_){throw Error('Chat must use textContent');}})},performance:{now:()=>now},require:name=>name==='three'?T:require(name),Date:class extends Date{static now(){return now}},console};vm.runInNewContext(code,sandbox);
 const r=Object.create(sandbox.window.TuatCanvas.prototype),view=(id,team,x,z)=>({fighter:{id,name:id,team,hp:100},base:new T.Vector3(x,.1,z),height:1.6,team});
 Object.assign(r,{ready:true,units:new Map(),spectators:new Map(),camera:new T.OrthographicCamera(-10,10,18,-18,.1,100),yaw:.02,broadcast:{dataset:{}},shotBurst(){},heart(){},barkEffect(){},state:{phase:waitingOnly?'break':'battle',round:1,config:{},people:[],events:[]}});
 const left=view('An','left',-2.5,0),right=view('Bình','right',2.5,1);(waitingOnly?r.spectators:r.units).set('An',left).set('Bình',right);
 // No WebGL or DOM mock is used to assert GPU output: these tests exercise actual camera math/lifecycle.
 r.director=new Director();r.sync=()=>{};r.camera.position.set(Math.sin(r.yaw)*31,25,3+Math.cos(r.yaw)*31);r.cameraFocus=new T.Vector3(0,0,3);r.update(r.state);
 return{r,advance:ms=>now+=ms,now:()=>now,setPixelRatio:ratio=>sandbox.devicePixelRatio=ratio,setViewport:(width,height)=>{sandbox.innerWidth=width;sandbox.innerHeight=height;}};
}
let Director,T;
test.before(async()=>{T=await import('three');Director=(await import('../src/live-camera.mjs')).LiveCameraDirector;});

test('An eight-second orbit moves around the court and returns to overview without a caption',()=>{
 const {r,advance,now}=fixture({waitingOnly:true});r.previewShot('orbit',1.25);assert.equal(r.director.active.kind,'orbit');advance(2000);r.updateCamera(now());const eye=r.camera.position.clone();assert.ok(r.camera.zoom>1);advance(3000);r.updateCamera(now());assert.ok(eye.distanceTo(r.camera.position)>1);assert.ok(r.camera.position.toArray().every(Number.isFinite));advance(3000);r.updateCamera(now());assert.equal(r.camera.zoom,1);assert.equal(r.broadcast.dataset.cameraShot,undefined);
});

test('Spoken welcome/gift cameras retain their old angle, zoom, speed and speech-end behavior',()=>{
 const {r,now,advance}=fixture();r.state.people=[{id:'An'},{id:'Bình'}];r.speechPlayback({phase:'start',id:'first',welcome:{personId:'An',team:'left'},duration:5,startedAt:now()});assert.equal(r.director.active.event.personId,'An');const id=r.director.active.id;
 advance(800);r.speechPlayback({phase:'start',id:'first',welcome:{personId:'An'},duration:5,startedAt:now()-800});assert.equal(r.director.active.id,id);r.updateCamera(now());assert.equal(r.camera.zoom,3.1);const angle=1.04+Math.sin(800/5850*Math.PI)*.08,focus=r.units.get('An').base.clone().add(new T.Vector3(0,.8,0)),eye=focus.clone().add(new T.Vector3(Math.sin(angle)*22,13.5,Math.cos(angle)*22));assert.ok(r.camera.position.distanceTo(eye)<1e-9);
 r.speechPlayback({phase:'end',id:'first',completed:true});assert.equal(r.director.active.ends,now()+850);advance(850);r.updateCamera(now());assert.equal(r.camera.zoom,1);
 r.speechPlayback({phase:'start',id:'gift',presentation:{kind:'gift',event:{personId:'Bình',team:'right',gift:'dragon'}},duration:5,startedAt:now()});advance(800);r.updateCamera(now());assert.equal(r.camera.zoom,2.8);assert.equal(r.director.active.kind,'gift');r.speechPlayback({phase:'end',id:'gift',completed:false});assert.equal(r.director.active,null);
});

test('Finishing a match during a close-up cancels its target and smoothly restores the full court after roster removal',()=>{
 const {r,advance,now}=fixture();r.previewShot('orbit',1);advance(1000);r.updateCamera(now());const zoom=r.camera.zoom;assert.ok(zoom>1);
 r.sync=()=>r.units.clear();r.update({...r.state,phase:'break'});assert.equal(r.director.active,null);r.updateCamera(now());assert.ok(Math.abs(r.camera.zoom-zoom)<1e-9);
 advance(325);r.updateCamera(now());assert.ok(r.camera.zoom>1&&r.camera.zoom<zoom);
 advance(325);r.updateCamera(now());assert.equal(r.camera.zoom,1);assert.deepEqual(r.cameraFocus.toArray(),[0,2,3.3]);assert.equal(r.returnFrom,null);
});

test('Turning off auto zoom during a shot returns smoothly and never replays it when enabled again',()=>{
 const {r,advance,now}=fixture();r.previewShot('orbit',1);advance(1000);r.updateCamera(now());assert.ok(r.camera.zoom>1);
 r.update({...r.state,config:{cameraEnabled:false}});assert.equal(r.director.active,null);advance(700);r.updateCamera(now());assert.equal(r.camera.zoom,1);
 r.update({...r.state,config:{cameraEnabled:true}});assert.equal(r.director.active,null);
});

test('A round change also drops a deferred skill whose fighter has already left the court',()=>{
 const {r,now}=fixture();r.director.pending={kind:'skill',event:{id:'old-round-skill',at:now(),actor:'An',gift:'dragon'}};r.director.wideUntil=now()+100;
 r.update({...r.state,phase:'break'});assert.equal(r.director.pending,null);assert.equal(r.director.active,null);
});

test('A waiting dog animates once for each fresh bark, while stale events and reload history stay silent',()=>{
 const {r,now}=fixture({waitingOnly:true}),played=[],waves=[];r.effects=[];r.play=(u,clip)=>played.push([u.fighter.id,clip]);r.wave=u=>waves.push(u.fighter.id);
 const bark={id:'new-bark',kind:'bark',actor:'An',spectator:true,at:now()};r.update({...r.state,events:[bark]});assert.deepEqual(played,[]);assert.deepEqual(waves,['An']);assert.equal(r.spectators.get('An').barkUntil,now()+700);assert.equal(r.barkFeatured.id,'An');
 r.update(r.state);assert.equal(waves.length,1);r.update({...r.state,events:[bark,{...bark,id:'stale',at:now()-3000}]});assert.equal(waves.length,1);
 delete r.seenSocial;r.update({...r.state,events:[{...bark,id:'reload'}]});assert.equal(waves.length,1);
});

test('Closer portrait overview keeps the clock, signs, all fighters, last waiting row and every full plant inside the frame',()=>{
 const {r,now}=fixture();r.renderer={setSize(){}};r.canvas={clientWidth:1080,clientHeight:1920};r.resize();r.camera.updateMatrixWorld(true);
 const before=r.camera.position.clone();r.updateCamera(now());assert.ok(before.distanceTo(r.camera.position)<1e-9,'Initial frame and cinematic return use the same overview');r.camera.updateMatrixWorld(true);
 const points=[];
 const bounds=(xs,ys,zs)=>{for(const x of xs)for(const y of ys)for(const z of zs)points.push(new T.Vector3(x,y,z));};
 bounds([-4.7,4.7],[4.875,8.125],[-10.95,-10.65]); // Roof clock including its frame.
 bounds([-8.1,-3.9],[1.35,7.65],[-4.65,-4.35]); // Guide sign.
 bounds([3.6,8.1],[.7,8.9],[-4.65,-4.35]); // Gift sign.
 for(const x of [-2.55,2.55])for(const z of [-5,-1.5,2,5.5,9])bounds([x-1.2,x+1.2],[.08,3.7],[z-1.2,z+1.2]);
 bounds([-7.8,7.8],[.15,2.5],[4.7,9.3]); // Side spectators.
 bounds([-7.65,7.65],[.15,2.5],[15.3,23.3]); // All three waiting rows.
 for(const [x,z] of [[-7,1],[7,1],[-7,13],[7,13],[-6.8,23],[6.8,23]])bounds([x-1,x+1],[0,2],[z-.7,z+.7]); // Complete pots and foliage.
 for(const p of points){const v=p.clone().project(r.camera);assert.ok(Math.abs(v.x)<.99&&Math.abs(v.y)<.99&&v.z>-1&&v.z<1,`Clipped scene point ${p.toArray()}: ${v.toArray()}`);}
 assert.ok(10.15/r.camera.right>1.17,'Fighters remain at least 17% larger than the original overview');
});

test('Small chat bubbles follow the correct fighter or spectator, render plain text, replace per person and expire without another snapshot',()=>{
 const {r,now,advance}=fixture();r.chatLayer={append(){}};r.chatBubbles=new Map();r.canvas={clientWidth:1080,clientHeight:1920};r.renderer={setSize(){}};r.resize();
 const dog=r.units.get('An');dog.root=new T.Group();dog.root.position.copy(dog.base);
 r.syncChats({...r.state,people:[{id:'An',name:'An',chat:{id:'one',text:'<b>Chào xóm!</b>',at:now()}}]},now());assert.equal(r.chatBubbles.size,1);let bubble=r.chatBubbles.get('An');assert.equal(bubble.text.textContent,'<b>Chào xóm!</b>');assert.equal(bubble.element['aria-label'],'Tuất An: <b>Chào xóm!</b>');
 r.positionChats(now());assert.equal(bubble.element.hidden,false);const x=parseFloat(bubble.element.style.left);dog.root.position.x+=1;r.positionChats(now());assert.ok(parseFloat(bubble.element.style.left)>x);
 advance(1000);r.syncChats({...r.state,people:[{id:'An',name:'An',chat:{id:'two',text:'Gâu!',at:now()}}]},now());assert.equal(r.chatBubbles.get('An'),bubble);assert.equal(bubble.text.textContent,'Gâu!');
 r.units.delete('An');r.spectators.set('An',dog);r.positionChats(now());assert.equal(bubble.element.hidden,false);
 advance(4500);r.positionChats(now());assert.equal(r.chatBubbles.size,0);assert.equal(bubble.element.removed,true);
});

test('Chat display is bounded to six recent viewers and ignores empty, expired or future messages',()=>{
 const {r,now}=fixture();r.chatLayer={append(){}};r.chatBubbles=new Map();const people=Array.from({length:12},(_,i)=>({id:'p'+i,name:'Người '+i,chat:{id:'c'+i,text:'Xin chào',at:now()-i*100}}));
 people.push({id:'old',chat:{id:'old',text:'old',at:now()-4500}},{id:'future',chat:{id:'future',text:'future',at:now()+1}},{id:'empty',chat:{id:'empty',text:'',at:now()}});
 r.syncChats({...r.state,people},now());assert.equal(r.chatBubbles.size,6);assert.deepEqual([...r.chatBubbles.keys()],['p0','p1','p2','p3','p4','p5']);
 r.syncChats({...r.state,people:[]},now());assert.equal(r.chatBubbles.size,0);
});

test('A barking dog stays idle with a sound pulse; only an upgraded creature plays the attack clip',()=>{
 const {r,now}=fixture(),played=[];r.units.clear();r.spectators.clear();r.label=()=>{};r.syncSpectators=()=>{};r.wave=()=>{};r.play=(u,clip)=>played.push(clip);
 const f={id:'An',name:'An',team:'left',slot:0,breed:'shiba',form:'dog',hp:200,maxHp:200,barkAt:now(),attackAt:now()},u={root:new T.Group(),key:'shiba',team:'left',slot:0,clip:'idle',lastAttack:0};r.units.set(f.id,u);
 Object.getPrototypeOf(r).sync.call(r,{phase:'battle',paused:false,config:{modelScale:1},fighters:[f]});assert.deepEqual(played,[]);assert.equal(u.barkUntil,now()+700);
 f.form='tiger';f.barkAt++;f.attackAt++;u.key='tiger';Object.getPrototypeOf(r).sync.call(r,{phase:'battle',paused:false,config:{modelScale:1},fighters:[f]});assert.deepEqual(played,['attack']);
});

test('Graphical barks emit mouth waves, dragons aim fire at the event target and tigers leave three claw trails; all resources expire',()=>{
 const {r,now,advance}=fixture();r.effects=[];r.group=new T.Group();r.renderer={render(){}};r.world={update(){}};r.active=true;r.previous=0;r.elapsed=0;r.lastDraw=0;
 for(const u of r.units.values()){u.root=new T.Group();u.root.position.copy(u.base);u.root.rotation.y=u.team==='left'?Math.PI/2:-Math.PI/2;u.form='dog';u.clip='idle';u.fighter.hp=200;}
 const emit=event=>Object.getPrototypeOf(r).barkEffect.call(r,{actor:'An',target:'Bình',kind:'skill',...event});
 emit({actorForm:'dog',physical:false});assert.equal(r.effects.length,3);assert.ok(r.effects.every(e=>e.type==='voice'&&e.mesh.geometry.type==='RingGeometry'&&e.mesh.material.color.getHex()===0xffffff));assert.ok(r.effects.every(e=>e.mesh.position.x>r.units.get('An').base.x));
 const caster=r.units.get('An');caster.form='dragon';caster.key='dragon';caster.dragon={};
 emit({actorForm:'dragon',physical:true});const fire=r.effects.filter(e=>e.type==='fire');assert.equal(fire.length,1);const expected=r.units.get('Bình').root.localToWorld(new T.Vector3(0,1.6*.55,0));for(const e of fire){assert.ok(e.curve.getPoint(1).distanceTo(expected)<1e-8);assert.ok(e.curve.getPoint(.5).distanceTo(e.curve.getPoint(0).lerp(expected,.5))<1e-8,'single straight jet');}
 caster.form='tiger';delete caster.dragon;emit({actorForm:'tiger',physical:true});assert.equal(r.effects.filter(e=>e.type==='claw').length,6);assert.equal(r.effects.filter(e=>e.type==='voice').length,6);
 let geometries=0,materials=0;const count=r.effects.length;for(const e of r.effects){e.mesh.geometry.addEventListener('dispose',()=>geometries++);e.mesh.material.addEventListener('dispose',()=>materials++);}
 for(let i=1;i<=40;i++){advance(50);r.frame(i*50);}assert.equal(r.effects.length,0);assert.equal(geometries,count);assert.equal(materials,count);assert.equal(r.broadcast.dataset.visualFx,'');
});

test('Stale dragon events cannot make a dog breathe fire, and removing the real dragon cancels its entire jet',()=>{
 const {r}=fixture();r.effects=[];r.group=new T.Group();r.resourceDisposals=0;
 for(const u of r.units.values()){u.root=new T.Group();u.root.position.copy(u.base);u.form='dog';u.key='shiba';}
 const emit=event=>Object.getPrototypeOf(r).barkEffect.call(r,{actor:'An',target:'Bình',kind:'skill',actorForm:'dragon',physical:true,...event});
 emit();assert.equal(r.effects.length,0,'dog plus old dragon event stays silent visually');
 const u=r.units.get('An');u.form='dragon';u.key='dragon';u.dragon={root:new T.Group()};
 emit({kind:'bark',physical:false});assert.ok(r.effects.every(e=>e.type==='voice'),'a dragon barking does not fire');r.effects.forEach(e=>{e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();});r.effects=[];
 emit({target:'missing'});emit({target:'An'});assert.equal(r.effects.length,0);
 emit();assert.equal(r.effects.filter(e=>e.type==='fire').length,1);assert.ok(r.effects.every(e=>e.caster===u&&e.recipient===r.units.get('Bình')));
 r.units.get('Bình').root.position.z+=1;const flame=r.effects.find(e=>e.type==='fire');flame.update(.05,.1,r.camera,{domElement:{width:1080}});const end=r.units.get('Bình').root.localToWorld(new T.Vector3(0,r.units.get('Bình').height*.55,0));assert.ok(flame.target.distanceTo(end)<1e-8,'jet tracks its one victim');
 u.label=new T.Sprite(new T.SpriteMaterial({map:new T.Texture()}));u.ring=new T.Mesh(new T.RingGeometry(),new T.MeshBasicMaterial());
 Object.getPrototypeOf(r).dispose.call(r,u);assert.equal(r.effects.length,0);assert.equal(r.group.children.length,0,'no orphan jet left at a replacement dog position');
});


test('Dense crowd layout keeps every viewer on the patio and instanced batches keep all identities through arrivals and promotions',async()=>{
 const {crowdLayout,BakedCrowd,bakeCrowdParts}=await import('../src/live-crowd.mjs');for(const count of [0,24,100,601,1500]){const layout=crowdLayout(count);assert.equal(layout.length,count);assert.ok(layout.every(p=>Math.abs(p.x)<8&&p.z<=23.5&&p.scale>0));assert.equal(new Set(layout.map(p=>p.x+':'+p.z)).size,count);}
 const group=new T.Group(),root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({color:0xc49a52}));mesh.position.set(0,1,0);root.add(mesh);const parts=bakeCrowdParts(root);assert.equal(parts[0].material.color.getHex(),0xc49a52);assert.ok(parts[0].geometry.boundingSphere.center.y>.9);
 const batch=new BakedCrowd(group,()=>parts),entries=Array.from({length:600},(_,i)=>({id:'p'+i,key:'shiba',...crowdLayout(600)[i]}));batch.set(entries);assert.equal(batch.count,600);assert.ok(batch.ids.has('p0'));assert.equal(group.children.length,1);batch.set([...entries,{id:'new',key:'shiba',...entries[0]}]);assert.equal(batch.count,601);assert.ok(batch.ids.has('p0'));batch.set(entries.filter(e=>e.id!=='p0'));assert.equal(batch.count,599);assert.ok(batch.ids.has('p1'));batch.dispose();parts[0].geometry.dispose();parts[0].material.dispose();
});


test('Tiger claws remain readable past the camera move, track only the actual enemy and release their badge texture',()=>{
 const {r}=fixture();r.effects=[];r.group=new T.Group();for(const u of r.units.values()){u.root=new T.Group();u.root.position.copy(u.base);u.form='dog';u.key='shiba';}const tiger=r.units.get('An'),enemy=r.units.get('Bình');tiger.form='tiger';tiger.key='tiger';Object.getPrototypeOf(r).barkEffect.call(r,{id:'claw',kind:'skill',actor:'An',target:'Bình',actorForm:'tiger',physical:true,damage:29,at:10000});
 const claws=r.effects.filter(e=>e.type==='claw');assert.equal(claws.length,6);assert.ok(r.effects.filter(e=>e.type!=='voice').every(e=>e.caster===tiger&&e.recipient===enemy));enemy.root.position.z+=2;for(const e of claws){e.update(.05,1,r.camera);assert.ok(e.mesh.material.opacity>.8);assert.equal(e.mesh.material.depthTest,false);assert.ok(e.life>1.5);assert.ok(e.mesh.position.distanceTo(enemy.root.localToWorld(new T.Vector3(0,enemy.height*.6,0)))<1e-6);}
 const badge=r.effects.find(e=>e.type==='damage');assert.ok(badge);let disposed=false;badge.mesh.material.map.addEventListener('dispose',()=>disposed=true);r.disposeEffect(badge);assert.equal(disposed,true);r.effects=r.effects.filter(e=>e!==badge);for(const e of r.effects)r.disposeEffect(e);r.effects=[];
 const pose=r.makeShotPose({kind:'skill',zoom:3.6,event:{actor:'An',target:'Bình',gift:'tiger',actorForm:'tiger',physical:true,damage:29,team:'left'}});assert.ok(pose.zoom<=2.2);assert.ok(pose.focus.toArray().every(Number.isFinite));
});


test('Orbit keeps all ten full fighter bounds inside portrait framing throughout entry, travel and return',()=>{
 const {r,advance,now}=fixture();r.renderer={setSize(){}};r.canvas={clientWidth:1080,clientHeight:1920};r.units.clear();for(const side of [-1,1])for(let i=0;i<5;i++){const id=side+':'+i;r.units.set(id,{base:new T.Vector3(side*2.55,.1,-5+i*3.5),height:2.9,fighter:{id}});}r.resize();r.previewShot('orbit',1.25);
 for(let time=0;time<=8000;time+=250){if(time)advance(250);r.updateCamera(now());r.camera.updateMatrixWorld(true);for(const u of r.units.values())for(const dx of [-1.25,1.25])for(const y of [0,3.9])for(const dz of [-1.25,1.25]){const p=new T.Vector3(u.base.x+dx,y,u.base.z+dz).project(r.camera);assert.ok(Math.abs(p.x)<.99&&Math.abs(p.y)<.99,'orbit clipped fighter at '+time+' ms');}}
 assert.equal(r.camera.zoom,1);
});

test('Spam keeps one continuous bark phase even on a model without a native bark action',()=>{
 const {r,now,advance}=fixture(),u={};r.startBark(u,now());const start=u.barkStartedAt;for(let i=0;i<20;i++){advance(10);r.startBark(u,now(),5);}assert.equal(u.barking,true);assert.equal(u.barkStartedAt,start);assert.ok(u.barkUntil>now());
});

test('Far crowd reactions stay grounded, keep their pulse phase under spam and settle after input stops',async()=>{
 const {BakedCrowd}=await import('../src/live-crowd.mjs'),group=new T.Group(),parts=[{geometry:new T.BoxGeometry(),material:new T.MeshStandardMaterial()}],crowd=new BakedCrowd(group,()=>parts),e={id:'far',key:'dog',x:0,z:20,scale:.4,yaw:Math.PI/2,barkAt:1000};crowd.set([{...e}]);crowd.update(1210);const matrix=new T.Matrix4(),position=new T.Vector3();crowd.pools.get('dog').meshes[0].getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);assert.ok(position.x>0);assert.ok(Math.abs(position.y-.15)<1e-6);crowd.set([{...e,barkAt:1250}]);assert.equal(crowd.barkStarts.get('far').start,1000);crowd.update(2100);crowd.pools.get('dog').meshes[0].getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);assert.ok(Math.abs(position.x)<1e-6);crowd.dispose();
});


test('Crowd name atlases retain every name beyond the detailed-rig limit, through promotions, renames and departure',async()=>{
 const {CrowdLabels}=await import('../src/live-crowd-labels.mjs'),oldDocument=global.document,drawn=[];global.document={createElement:()=>({getContext:()=>({clearRect(){},beginPath(){},roundRect(){},fill(){},fillText(text){drawn.push(text);}})})};
 try{const group=new T.Group(),labels=new CrowdLabels(group),rows=Array.from({length:601},(_,i)=>({id:'p'+i,name:'Tuất Khách '+i,caption:'CHỜ GHÉP XÓM',height:1.6,x:i%8,z:16+Math.floor(i/8)*.1,scale:.4}));labels.set(rows);assert.equal(labels.count,601);assert.equal(group.children.length,5);assert.equal(group.children.reduce((n,m)=>n+m.count,0),601);assert.ok(drawn.includes('Tuất Khách 600'));const first=labels.pages[0].texture.version;labels.set(rows);assert.equal(labels.pages[0].texture.version,first,'stable names must not redraw on every snapshot');labels.set(rows.slice(8).map((e,i)=>i?e:{...e,name:'Tuất Đã đổi tên'}));assert.equal(labels.count,593);assert.ok(drawn.includes('Tuất Đã đổi tên'));labels.set(rows.slice(0,20));assert.equal(group.children.length,1);assert.equal(labels.count,20);labels.dispose();assert.equal(group.children.length,0);}finally{global.document=oldDocument;}
});

test('A packet of fifteen hearts sustains the fast visual bark rhythm and new packets keep its phase',()=>{
 const {r,now,advance}=fixture(),u={};r.startBark(u,now(),15,true);assert.equal(u.barkCycle,380);assert.equal(u.barkUntil,now()+3300);const start=u.barkStartedAt;advance(200);r.startBark(u,now(),15,true);assert.equal(u.barkStartedAt,start);assert.equal(u.barkUntil,now()+3300);
});


test('Human and bot nameplates use one fixed palette independent of camera exposure and detail level',async()=>{
 const {nameplateFill,CrowdLabels}=await import('../src/live-crowd-labels.mjs');assert.equal(nameplateFill(false),'#fffdf5');assert.equal(nameplateFill(true),'#f5edcf');const old=global.document,fills=[];global.document={createElement:()=>({getContext:()=>({clearRect(){},beginPath(){},roundRect(){},fill(){fills.push(this.fillStyle);},fillText(){}})})};try{const labels=new CrowdLabels(new T.Group());labels.set([{id:'human',name:'Tuất An',caption:'CHỜ GHÉP XÓM',x:0,z:1,scale:.6,height:1.6,bot:false},{id:'bot',name:'Tuất Vàng',caption:'BOT GIỮ SÂN',x:2,z:1,scale:.6,height:1.6,bot:true}]);assert.deepEqual(fills,['#fffdf5','#f5edcf']);assert.equal(labels.pages[0].material.toneMapped,false);labels.dispose();}finally{global.document=old;}
});


test('Nameplates measure Unicode names and use an ellipsis without horizontally squeezing text',async()=>{
 const {drawName}=await import('../src/live-crowd-labels.mjs'),calls=[],ctx={measureText:text=>({width:Array.from(text).length*10}),fillText:(...args)=>calls.push(args)};drawName(ctx,'Tuất Nguyễn Thị Minh Anh',10,20,100);assert.ok(calls[0][0].endsWith('…'));assert.ok(ctx.measureText(calls[0][0]).width<=100);assert.equal(calls[0].length,3);drawName(ctx,'Tuất Na',10,20,100);assert.equal(calls[1][0],'Tuất Na');
});


test('Medium crowd nameplates keep their world size as dog density changes and texture tiers resize safely',async()=>{
 const {CrowdLabels,NAMEPLATE_WIDTH,NAMEPLATE_HEIGHT}=await import('../src/live-crowd-labels.mjs'),old=global.document;global.document={createElement:()=>({getContext:()=>({clearRect(){},beginPath(){},roundRect(){},fill(){},fillText(){}})})};
 try{const labels=new CrowdLabels(new T.Group()),row=i=>({id:'p'+i,name:'Tuất Nguyễn '+i,bot:false,height:1.6,x:i%8,z:16+Math.floor(i/8),scale:i%2?.1:.65}),matrix=new T.Matrix4(),scale=new T.Vector3();labels.set([row(0),row(1)]);const small=labels.pages[0].texture;let disposed=false;small.addEventListener('dispose',()=>disposed=true);for(let i=0;i<2;i++){labels.pages[0].mesh.getMatrixAt(i,matrix);scale.setFromMatrixScale(matrix);assert.ok(Math.abs(scale.x-NAMEPLATE_WIDTH)<1e-6);assert.ok(Math.abs(scale.y-NAMEPLATE_HEIGHT)<1e-6);}
  labels.set(Array.from({length:40},(_,i)=>row(i)));const large=labels.pages[0].texture;assert.notEqual(large,small);assert.equal(disposed,true);assert.equal(large.image.height,2048);assert.equal(labels.pages[0].material.uniforms.map.value,large);const rect=labels.pages[0].geometry.getAttribute('labelRect');for(let i=0;i<40;i++){const bottom=rect.getY(i),top=bottom+rect.getW(i);assert.ok(bottom>=0&&top<=1);assert.ok(Math.abs(rect.getW(i)*large.image.height-126)<.001);}
  labels.set(Array.from({length:39},(_,i)=>row(i)));assert.equal(labels.pages[0].texture,large,'same-size arrivals must reuse the texture');labels.set([row(0)]);assert.notEqual(labels.pages[0].texture,large);assert.equal(labels.pages[0].texture.image.height,128);labels.dispose();}finally{global.document=old;}
});


test('Actual spectator transitions keep the assigned model when arrivals move someone between detailed and batched rendering',()=>{
 const {r,now}=fixture({waitingOnly:true}),state=E.create(now()),batches=new Map();r.spectators.clear();r.group=new T.Group();r.crowd={set(entries){batches.clear();for(const e of entries)batches.set(e.id,e.key);}};r.crowdLabels={count:0,set(entries){this.count=entries.length;}};r.dispose=u=>u.root.removeFromParent();r.visual=f=>({root:new T.Group(),base:new T.Vector3(),height:1.6,fighter:f,key:f.form==='dog'?f.breed:f.form,form:f.form,team:f.team,labelCanvas:{getContext:()=>({clearRect(){},beginPath(){},roundRect(){},fill(){},fillText(){}})},label:{scale:new T.Vector3(),material:{map:{dispose(){}}}},ring:{}});
 for(let i=0;i<30;i++)E.dispatch(state,{id:'j'+i,type:'join',userId:'same-'+i,name:'Khách '+i},now());const original=new Map(state.people.map(p=>[p.id,p.breed]));const check=()=>{r.syncSpectators(state);for(const p of state.people){const actual=r.spectators.get(p.id)?.key||batches.get(p.id);assert.equal(actual,p.permanentForm||original.get(p.id));}};check();const chosen=state.people[20];r.featured={personId:chosen.id,until:now()+10000};check();assert.ok(r.spectators.has(chosen.id));for(let i=30;i<140;i++)E.dispatch(state,{id:'j'+i,type:'join',userId:'same-'+i,name:'Khách '+i},now());for(const p of state.people)if(!original.has(p.id))original.set(p.id,p.breed);chosen.breed=chosen.assignedBreed==='pug'?'corgi':'pug';r.featured=null;check();assert.ok(batches.has(chosen.id));r.featured={personId:chosen.id,until:now()+10000};check();assert.equal(r.spectators.get(chosen.id).key,chosen.assignedBreed);chosen.permanentForm='dragon';check();assert.equal(r.spectators.get(chosen.id).key,'dragon');
});


test('Busy crowds fill both side walkways evenly, avoid the arena and trees, and stay inside portrait overview',async()=>{
 const {crowdLayout}=await import('../src/live-crowd.mjs'),{r}=fixture();r.renderer={setSize(){}};r.canvas={clientWidth:1080,clientHeight:1920};r.resize();r.camera.updateMatrixWorld(true);
 for(const count of [25,40,100,200,601,1500]){const layout=crowdLayout(count),left=layout.filter(p=>p.zone==='left'),right=layout.filter(p=>p.zone==='right'),front=layout.filter(p=>p.zone==='front');assert.ok(left.length>2&&right.length>2);assert.equal(left.length,right.length);assert.equal(left.length+right.length+front.length,count);assert.equal(new Set(layout.map(p=>p.x+':'+p.z)).size,count);assert.ok(front.length<count-4,'front rows are relieved as side seats fill');for(const p of [...left,...right]){assert.ok(Math.abs(p.x)>=6.35&&Math.abs(p.x)<=7.45);assert.ok(p.z>2.8&&p.z<10.8);assert.ok(p.scale>0&&p.scale<=.5);for(const dx of [-.9,.9]){const projected=new T.Vector3(p.x+dx,.15+2.9*p.scale+.5,p.z).project(r.camera);assert.ok(Math.abs(projected.x)<.995&&Math.abs(projected.y)<.995,'side nameplate leaves the portrait overview');}}}
 const quiet=crowdLayout(14);assert.equal(quiet.filter(p=>p.zone==='left').length,2);assert.equal(quiet.filter(p=>p.zone==='right').length,2);assert.equal(quiet.filter(p=>p.zone==='front').length,10);
});


test('Irregular heart packets keep detailed and batched dogs moving through packet intervals without resetting phase',async()=>{
 const {r,now,advance}=fixture(),u={};r.startBark(u,now(),15,true);const start=u.barkStartedAt;advance(2800);assert.ok(u.barkUntil>now());r.startBark(u,now(),12,true);assert.equal(u.barkStartedAt,start);assert.ok(u.barkUntil>=now()+3400);r.startBark(u,now(),1,false);assert.equal(u.barkCycle,380);assert.ok(u.barkUntil>=now()+3400);
 const {BakedCrowd}=await import('../src/live-crowd.mjs'),parts=[{geometry:new T.BoxGeometry(),material:new T.MeshStandardMaterial()}],crowd=new BakedCrowd(new T.Group(),()=>parts),e={id:'stream',key:'dog',x:0,z:20,scale:.4,yaw:Math.PI/2,interactive:true};crowd.set([{...e,barkAt:1000,barkTotal:15}]);assert.equal(crowd.barkStarts.get('stream').until,4300);crowd.set([{...e,barkAt:3800,barkTotal:27}]);assert.equal(crowd.barkStarts.get('stream').start,1000);assert.ok(crowd.barkStarts.get('stream').until>=7200);crowd.dispose();
});
test('Spoken welcome decision freezes at onset; crowded banners cannot replay when viewers leave, gifts still zoom',()=>{
 const {r,now}=fixture();r.state.people=Array.from({length:31},(_,i)=>({id:i?'p'+i:'An'}));
 r.speechPlayback({phase:'start',id:'crowded',welcome:{personId:'An'},duration:5,startedAt:now()});assert.equal(r.director.active,null);
 r.state.people.pop();r.speechPlayback({phase:'start',id:'crowded',welcome:{personId:'An'},duration:5,startedAt:now()});assert.equal(r.director.active,null);
 r.speechPlayback({phase:'start',id:'thirty',welcome:{personId:'An'},duration:5,startedAt:now()});assert.equal(r.director.active.kind,'welcome');
 r.state.people.push({id:'p30'});r.speechPlayback({phase:'start',id:'paid-busy',welcomeMode:'banner',presentation:{kind:'gift',event:{personId:'An',gift:'rose'}},duration:5,startedAt:now()});assert.equal(r.director.active.kind,'gift');
});

test('Simultaneous skill camera contains every caster and victim, including during a donation shot',()=>{
 const {r,now,advance}=fixture();r.state.people=[{id:'An'},{id:'Bình'}];r.units.get('An').base.set(-2.55,.1,-5);r.units.get('Bình').base.set(2.55,.1,9);
 r.speechPlayback({phase:'start',id:'paid',presentation:{kind:'gift',event:{personId:'An',gift:'rose'}},duration:5,startedAt:now()});
 const events=[{id:'fire',at:now(),kind:'skill',physical:true,actor:'An',target:'Bình',personId:'An',actorForm:'dragon'},{id:'claw',at:now(),kind:'skill',physical:true,actor:'Bình',target:'An',personId:'Bình',actorForm:'tiger'}];r.update({...r.state,events});assert.equal(r.director.active.kind,'gift');assert.equal(r.director.active.skillEvents.length,2);
 advance(800);r.updateCamera(now());r.camera.updateMatrixWorld(true);for(const u of r.units.values())for(const dx of [-1.3,1.3])for(const dy of [0,u.height+.5])for(const dz of [-1.3,1.3]){const p=u.base.clone().add(new T.Vector3(dx,dy,dz)).project(r.camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,'caster/target clipped');}
});
test('A skill arriving during gift speech reframes over 650 ms without a camera jump or repeated gift burst',()=>{
 const {r,now,advance}=fixture();r.state.people=[{id:'An'},{id:'Bình'}];let bursts=0;r.shotBurst=()=>bursts++;
 r.speechPlayback({phase:'start',id:'thanks',presentation:{kind:'gift',event:{personId:'An'}},duration:5,startedAt:now()});advance(800);r.updateCamera(now());const eye=r.camera.position.clone(),focus=r.cameraFocus.clone(),zoom=r.camera.zoom;
 r.update({...r.state,events:[{id:'claw',kind:'skill',actor:'An',target:'Bình',personId:'An',actorForm:'tiger',physical:true,at:now()}]});r.updateCamera(now());assert.ok(r.camera.position.distanceTo(eye)<1e-9);assert.ok(r.cameraFocus.distanceTo(focus)<1e-9);assert.equal(r.camera.zoom,zoom);assert.equal(bursts,1);
 advance(325);r.updateCamera(now());assert.ok(r.camera.position.distanceTo(eye)>0);assert.equal(r.director.active.speechId,'thanks');advance(325);r.updateCamera(now());assert.equal(r.reframeFrom,null);assert.equal(bursts,1);
 r.speechPlayback({phase:'end',id:'thanks',completed:true});assert.ok(r.director.active.ends>=now()+3500,'fresh skill stays framed after gratitude finishes');
});
test('Disposing a clone frees its unique skeleton texture once and preserves shared model materials',()=>{
 const {r}=fixture();r.effects=[];const skeleton=new T.Skeleton([new T.Bone()]);skeleton.computeBoneTexture();let boneDisposed=0,sharedDisposed=0;skeleton.boneTexture.addEventListener('dispose',()=>boneDisposed++);const shared=new T.MeshStandardMaterial(),geometry=new T.BoxGeometry();shared.addEventListener('dispose',()=>sharedDisposed++);const visual=new T.Group();for(let i=0;i<2;i++){const mesh=new T.SkinnedMesh(geometry,shared);mesh.bind(skeleton);visual.add(mesh);}const u={root:new T.Group(),visual,label:new T.Sprite(new T.SpriteMaterial({map:new T.Texture()})),ring:new T.Mesh(new T.RingGeometry(),new T.MeshBasicMaterial())};u.root.add(visual);r.dispose(u);assert.equal(boneDisposed,1);assert.equal(sharedDisposed,0);geometry.dispose();shared.dispose();
});

test('Pooled rigs reset identity, bark, transforms, ring color and shadows without rebuilding their model',()=>{
 const {r}=fixture();r.group=new T.Group();r.effects=[];r.visualPool=new Map();r.pooledVisuals=1;const visual=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());mesh.castShadow=false;visual.add(mesh);const mixer=new T.AnimationMixer(visual),idle=mixer.clipAction(new T.AnimationClip('Idle',1,[])),root=new T.Group();root.add(visual);const old={root,key:'shiba',form:'dog',visual,mixer,actions:{Idle:idle},height:1.6,lean:new T.Group(),labelCanvas:{width:512,height:120},label:new T.Sprite(new T.SpriteMaterial({map:new T.Texture()})),ring:new T.Mesh(new T.RingGeometry(),new T.MeshBasicMaterial()),fighter:{id:'old'},barkUntil:999999,barkRhythm:{until:999999},labelKey:'old',lastHeart:999999};r.visualPool.set('shiba',[old]);
 const u=r.visual({id:'new',name:'New',breed:'shiba',form:'dog',team:'right',slot:3});assert.equal(u.root,root);assert.equal(u.visual,visual);assert.equal(u.fighter,undefined);assert.equal(u.barkUntil,undefined);assert.equal(u.barkRhythm,undefined);assert.equal(u.lastHeart,undefined);assert.equal(u.labelKey,undefined);assert.equal(u.team,'right');assert.equal(u.root.position.x,2.55);assert.equal(u.root.position.z,5.5);assert.equal(mesh.castShadow,true);assert.equal(r.pooledVisuals,0);r.releaseVisual(u);assert.equal(r.pooledVisuals,1);r.dispose(u);mesh.geometry.dispose();mesh.material.dispose();
});

test('Bark promotion has a short stable lease while every spectator cue still animates',()=>{
 const {r,now,advance}=fixture({waitingOnly:true});const effects=[];r.effects=[];r.barkEffect=e=>effects.push(e.actor);r.wave=()=>{};r.update({...r.state,events:[{id:'first',kind:'bark',actor:'An',spectator:true,at:now()}]});assert.equal(r.barkFeatured.id,'An');advance(100);r.update({...r.state,events:[...r.state.events,{id:'second',kind:'bark',actor:'Bình',spectator:true,at:now()}]});assert.equal(r.barkFeatured.id,'An');assert.deepEqual(effects,['An','Bình']);advance(2000);r.update({...r.state,events:[...r.state.events,{id:'third',kind:'bark',actor:'Bình',spectator:true,at:now()}]});assert.equal(r.barkFeatured.id,'Bình');
});
test('Preview renders at its actual visible size while full overlay keeps the original portrait resolution and framing',()=>{
 const {r,setViewport}=fixture();const sizes=[];r.renderer={setSize:(w,h)=>sizes.push([w,h])};r.canvas={clientWidth:1080,clientHeight:1920};setViewport(344,620);r.isPreview=true;r.resize();assert.deepEqual(sizes.at(-1),[344,612]);const frame=[r.camera.left,r.camera.right,r.camera.top,r.camera.bottom];r.isPreview=false;r.resize();assert.deepEqual(sizes.at(-1),[1080,1920]);assert.deepEqual([r.camera.left,r.camera.right,r.camera.top,r.camera.bottom],frame);
});

test('The model reuse pool has a hard limit instead of retaining every historical character',()=>{
 const {r}=fixture();r.visualPool=new Map();r.pooledVisuals=0;r.effects=[];let disposed=0;r.dispose=()=>disposed++;for(let i=0;i<50;i++)r.releaseVisual({key:'shiba',root:new T.Group()});assert.equal(r.pooledVisuals,20);assert.equal(r.visualPool.get('shiba').length,20);assert.equal(disposed,30);
});

test('Stream sources render native Full HD instead of extra desktop-DPI pixels and preserve the camera',()=>{
 const {r,setPixelRatio}=fixture();setPixelRatio(1.5);r.isPreview=false;r.isStream=false;assert.equal(r.pixelRatio(),1.5);r.isStream=true;assert.equal(r.pixelRatio(),1);r.renderer={setSize(){}};r.canvas={clientWidth:1080,clientHeight:1920};r.resize();const bounds=[r.camera.left,r.camera.right,r.camera.top,r.camera.bottom];assert.equal(r.canvas.clientWidth*r.pixelRatio(),1080);assert.equal(r.canvas.clientHeight*r.pixelRatio(),1920);r.isStream=false;r.resize();assert.deepEqual([r.camera.left,r.camera.right,r.camera.top,r.camera.bottom],bounds);
});
