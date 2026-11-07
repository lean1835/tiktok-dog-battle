const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// Exercise the actual GLTF loader and rig without pretending to test GPU output.
global.self=global;
global.createImageBitmap=async blob=>{
 const png=Buffer.from(await blob.arrayBuffer());
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20);assert.ok(width>0&&height>0);
 return{width,height,close(){}};
};
const modules=Promise.all([import('../src/vendor/GLTFLoader.js'),import('../src/model-presentation.mjs'),import('three')]);
async function load(id){const [{GLTFLoader}]=await modules,b=fs.readFileSync(path.join(__dirname,'../assets/models',id+'.glb'));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}

test('Four textured animals retain embedded PNG maps and report missing maps instead of silently turning white',async()=>{
 const [,{requireModelTextures}]=await modules;
 for(const key of ['pug','becgie','corgi','tiger']){
  const model=await load(key);assert.ok(requireModelTextures(model,key)>0,key);
  let material;model.scene.traverse(m=>{if(m.isMesh&&m.material.map)material=m.material;});
  const texture=material.map;material.map=null;assert.throws(()=>requireModelTextures(model,key),new RegExp(key));material.map=texture;
 }
});

test('Corgi is longer along its body axis while height, width, ground contact and its animated skeleton are preserved',async()=>{
 const [,{fitModel},T]=await modules,model=await load('corgi'),scene=model.scene,mixer=new T.AnimationMixer(scene);
 const idle=model.animations.find(c=>c.name.toLowerCase()==='idle');mixer.clipAction(idle).play();mixer.update(0);scene.updateMatrixWorld(true);
 const original=new T.Box3().setFromObject(scene).getSize(new T.Vector3()),scale=1.3/original.y;
 const fitted=fitModel(scene,'corgi',1.3),bounds=new T.Box3().setFromObject(fitted),size=bounds.getSize(new T.Vector3());
 assert.ok(Math.abs(size.y-1.3)<1e-6);assert.ok(Math.abs(size.x-original.x*scale)<1e-6);
 assert.ok(Math.abs(size.z-original.z*scale*1.45)<1e-6);assert.ok(Math.abs(bounds.min.y-.06)<1e-6);
 for(const clip of model.animations){mixer.stopAllAction();mixer.clipAction(clip).play();mixer.update(.25);const animated=new T.Box3().setFromObject(fitted);assert.ok(Number.isFinite(animated.min.y)&&animated.max.y>animated.min.y,clip.name);}
 assert.equal(scene.parent,fitted);assert.deepEqual(scene.scale.toArray(),[1,1,1]);
});

test('All five dog rigs have a head-only bark animation and a muzzle anchor that follows the animated head',async()=>{
 const [,{fitModel,prepareBarkRig},T]=await modules;
 for(const key of ['shiba','husky','pug','becgie','corgi']){
  const model=await load(key),root=new T.Group(),mixer=new T.AnimationMixer(model.scene),idle=model.animations.find(c=>/^idle$/i.test(c.name));mixer.clipAction(idle).play();mixer.update(0);root.add(fitModel(model.scene,key,1.6));const rig=prepareBarkRig(root,model.scene,model.animations,1.6);
  assert.ok(rig.clip?.tracks.length>0,key);assert.ok(rig.clip.tracks.every(t=>/^(Head|Mouth|Jaw|Neck\d*)\./i.test(t.name)),key+' must not animate legs or the body');
  const head=model.scene.getObjectByName('Head'),before=head.quaternion.clone(),origin=rig.anchor.getWorldPosition(new T.Vector3());assert.ok(origin.toArray().every(Number.isFinite));assert.ok(origin.z>0,key+' muzzle is at the front');
  mixer.clipAction(rig.clip).setLoop(T.LoopOnce,1).play();let motion=0;for(let i=0;i<12;i++){mixer.update(rig.clip.duration/16);motion=Math.max(motion,before.angleTo(head.quaternion));}assert.ok(motion>.005,key+' head visibly moves while barking');
  const current=rig.anchor.getWorldPosition(new T.Vector3());assert.ok(current.distanceTo(origin)>.002,key+' sound origin follows the mouth movement');
 }
});

test('Barking leans every breed forward with a planted floor instead of translating the root upward',async()=>{
 const [,{fitModel,prepareBarkRig,applyGroundedBark},T]=await modules;
 for(const key of ['shiba','husky','pug','becgie','corgi']){
  const model=await load(key),root=new T.Group(),lean=new T.Group(),mixer=new T.AnimationMixer(model.scene);mixer.clipAction(model.animations.find(c=>/^idle$/i.test(c.name))).play();mixer.update(0);lean.add(fitModel(model.scene,key,1.6));root.add(lean);const rig=prepareBarkRig(root,model.scene,model.animations,1.6);assert.ok(rig.clip.tracks.every(t=>t.name.endsWith('.quaternion')));assert.equal(rig.pawClip,undefined);
  const head=rig.head.getWorldPosition(new T.Vector3()),feet=[new T.Vector3(-.3,.06,-.6),new T.Vector3(.3,.06,.6)];for(const pulse of [.25,.5,1,0]){applyGroundedBark(lean,pulse);root.updateMatrixWorld(true);for(const foot of feet)assert.ok(foot.clone().applyMatrix4(lean.matrix).distanceTo(foot)<1e-8,key+' paws stay on their floor plane');const now=rig.head.getWorldPosition(new T.Vector3());assert.ok(now.y<=head.y+1e-8,key+' never jumps up');if(pulse)assert.ok(now.z>head.z+.02,key+' head reaches forward');assert.deepEqual(root.position.toArray(),[0,0,0]);}
 }
});

test('Natural jaws preserve original muzzle materials and width, open downward and do not alter shared geometry',async()=>{
 const [,{fitModel,prepareBarkRig,prepareNaturalJaw},T]=await modules;
 for(const key of ['shiba','husky','pug','becgie']){
  const model=await load(key),root=new T.Group(),mixer=new T.AnimationMixer(model.scene);mixer.clipAction(model.animations.find(c=>/^idle$/i.test(c.name))).play();mixer.update(0);root.add(fitModel(model.scene,key,1.6));const rig=prepareBarkRig(root,model.scene,model.animations,1.6),original=[];model.scene.traverse(m=>{if(m.isSkinnedMesh)original.push({mesh:m,geometry:m.geometry,positions:m.geometry.attributes.position.array.slice(),material:m.material});});
  const jaw=prepareNaturalJaw(root,model.scene,rig.head,1.6,key);assert.ok(jaw.contour.length>=3,key+' fitted lip contour');assert.ok(jaw.jaw.children.length>0);assert.ok(jaw.jaw.children.every(m=>original.some(o=>o.material===m.material)),key+' actual source material');const bounds=new T.Box3().setFromObject(jaw.jaw),width=bounds.max.x-bounds.min.x,closed=jaw.soundAnchor.getWorldPosition(new T.Vector3());jaw.update(1);root.updateMatrixWorld(true);const open=jaw.soundAnchor.getWorldPosition(new T.Vector3()),newBounds=new T.Box3().setFromObject(jaw.jaw);assert.ok(open.y<closed.y-.01,key+' mouth opens down');assert.ok(Math.abs(newBounds.max.x-newBounds.min.x-width)<1e-6,key+' mouth width never stretches');for(const o of original){assert.deepEqual(o.geometry.attributes.position.array,o.positions,key+' shared source geometry unchanged');if(o.mesh.geometry!==o.geometry){const weights=o.mesh.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<.001);}}for(const g of jaw.owned)for(const n of g.attributes.position.array)assert.ok(Number.isFinite(n),key+' no corrupt vertices');jaw.update(0);root.updateMatrixWorld(true);assert.ok(jaw.soundAnchor.getWorldPosition(new T.Vector3()).distanceTo(closed)<1e-6,key+' exact return to closed pose');
 }
});
