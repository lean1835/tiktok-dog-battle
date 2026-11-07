import * as THREE from 'three';
import barkRhythm from './live-bark-rhythm.js';
const {planBark}=barkRhythm;

// Spread a busy crowd along both outside walkways as well as the front patio.
// Every viewer keeps a place; these positions never enter the 5v5 court.
export function crowdLayout(count){
 const busy=count>24,perSide=busy?Math.min(32,Math.floor((count-8)/4)):2,sideCount=Math.min(count,perSide*2),frontCount=count-sideCount,cols=Math.max(8,Math.ceil(Math.sqrt(frontCount*1.65))),rows=Math.max(1,Math.ceil(frontCount/cols)),dx=15/cols,dz=8/rows,scale=Math.min(.65,dx/.95,dz/1.9),sideCols=perSide>6?2:1,sideRows=Math.max(1,Math.ceil(perSide/sideCols)),sideDz=8/sideRows;
 return Array.from({length:count},(_,i)=>{
  if(i<sideCount){const side=i%2?1:-1,j=Math.floor(i/2),col=j%sideCols,row=Math.floor(j/sideCols),x=side*(busy?(sideCols===1?7.1:6.35+col*1.1):7.2),z=busy?2.8+(row+.5)*sideDz:4.7+j*4.6;return{x,z,scale:busy?Math.min(.5,sideDz/1.9):.65,yaw:Math.atan2(-x,2-z),zone:side<0?'left':'right'};}
  const j=i-sideCount,col=j%cols,row=Math.floor(j/cols),x=(col-(cols-1)/2)*dx,z=15.5+(row+.5)*dz;return{x,z,scale,yaw:Math.atan2(-x,2-z),zone:'front'};
 });
}

export function bakeCrowdParts(root,exclude=new Set()){
 root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.setScalar(1);root.updateMatrixWorld(true);root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});const parts=[],v=new THREE.Vector3();
 root.traverse(m=>{if(!m.isMesh||exclude.has(m))return;const geometry=m.geometry.clone(),position=geometry.getAttribute('position');for(let i=0;i<position.count;i++){m.getVertexPosition(i,v);v.applyMatrix4(m.matrixWorld);position.setXYZ(i,v.x,v.y,v.z);}geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.morphAttributes={};geometry.computeVertexNormals();geometry.computeBoundingSphere();const copy=material=>material.clone();parts.push({geometry,material:Array.isArray(m.material)?m.material.map(copy):copy(m.material)});});return parts;
}

export class BakedCrowd{
 constructor(group,factory){this.group=group;this.factory=factory;this.pools=new Map();this.count=0;this.ids=new Set();this.barkStarts=new Map();this.matrix=new THREE.Matrix4();this.position=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.scale=new THREE.Vector3();}
 set(entries){
  const groups=new Map();this.ids=new Set(entries.map(e=>e.id));this.count=entries.length;for(const e of entries){const old=this.barkStarts.get(e.id);if(e.barkAt){const count=old&&e.barkAt!==old.last?Math.max(1,(e.barkTotal||0)-(old.total||0)):Math.max(1,e.barkTotal||1),rhythm=e.interactive?(old&&e.barkAt===old.last?old.rhythm:planBark(old?.rhythm,e.barkAt,count)):null;e.barkUntil=old&&e.barkAt===old.last?old.until:rhythm?rhythm.until:e.barkAt+750;e.barkStart=old&&e.barkAt<(old.until||old.last+750)?old.start:e.barkAt;this.barkStarts.set(e.id,{start:e.barkStart,last:e.barkAt,until:e.barkUntil,total:e.barkTotal,rhythm});}if(!groups.has(e.key))groups.set(e.key,[]);groups.get(e.key).push(e);}for(const id of this.barkStarts.keys())if(!this.ids.has(id))this.barkStarts.delete(id);
  for(const pool of this.pools.values())for(const mesh of pool.meshes){mesh.count=0;mesh.visible=false;}
  for(const [key,rows]of groups){let pool=this.pools.get(key);if(!pool){pool={parts:this.factory(key),meshes:[],capacity:0};this.pools.set(key,pool);}if(pool.capacity<rows.length){for(const m of pool.meshes){m.removeFromParent();m.dispose();}pool.capacity=2**Math.ceil(Math.log2(Math.max(8,rows.length)));pool.meshes=pool.parts.map(part=>{const m=new THREE.InstancedMesh(part.geometry,part.material,pool.capacity);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.castShadow=false;m.receiveShadow=true;m.frustumCulled=false;this.group.add(m);return m;});}
   pool.rows=rows;pool.moving=false;for(let i=0;i<rows.length;i++){const e=rows[i];this.position.set(e.x,.15,e.z);this.rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,e.yaw);this.scale.setScalar(e.scale);this.matrix.compose(this.position,this.rotation,this.scale);for(const m of pool.meshes)m.setMatrixAt(i,this.matrix);}
   for(const m of pool.meshes){m.count=rows.length;m.visible=true;m.instanceMatrix.needsUpdate=true;}
  }
 }
 update(now){
  for(const pool of this.pools.values()){
   if(!pool.meshes[0]?.visible)continue;const moving=pool.rows.some(e=>e.barkAt>0&&now-e.barkAt>=0&&now<(e.barkUntil||e.barkAt+750));if(!moving&&!pool.moving)continue;
   for(const [i,e]of pool.rows.entries()){const age=now-e.barkAt,pulse=e.barkAt>0&&age>=0&&now<(e.barkUntil||e.barkAt+750)?Math.sin(((now-(e.barkStart||e.barkAt))%(e.interactive?380:420))/(e.interactive?380:420)*Math.PI)*Math.min(1,((e.barkUntil||e.barkAt+750)-now)/120):0;this.position.set(e.x+Math.sin(e.yaw)*pulse*.18*e.scale,.15,e.z+Math.cos(e.yaw)*pulse*.18*e.scale);this.rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,e.yaw);this.scale.setScalar(e.scale);this.matrix.compose(this.position,this.rotation,this.scale);for(const m of pool.meshes)m.setMatrixAt(i,this.matrix);}
   for(const m of pool.meshes)m.instanceMatrix.needsUpdate=true;pool.moving=moving;
  }
 }
 dispose(){for(const p of this.pools.values()){for(const m of p.meshes){m.removeFromParent();m.dispose();}for(const part of p.parts){part.geometry.dispose();for(const m of Array.isArray(part.material)?part.material:[part.material])m.dispose();}}this.pools.clear();this.ids.clear();this.count=0;}
}
