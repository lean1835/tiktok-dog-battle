import {AnimationClip,AnimationUtils,Box3,BufferGeometry,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,Object3D,Quaternion,Vector3,DoubleSide} from 'three';

export function prepareBarkRig(root,visual,animations,height){
 const source=animations.find(c=>/attack/i.test(c.name)),tracks=source?.tracks.filter(t=>/^(Head|Mouth|Jaw|Neck\d*)\.quaternion$/i.test(t.name)).map(t=>t.clone())||[];
 const clip=tracks.length?new AnimationClip('Bark',source.duration,tracks):null;if(clip)AnimationUtils.makeClipAdditive(clip,0,source);
 root.updateMatrixWorld(true);const bounds=new Box3().setFromObject(visual),point=new Vector3(),mouth=new Vector3();let count=0;
 // Derive the muzzle from the fitted mesh, rather than guessing one offset for every breed.
 visual.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry.attributes.position)return;const position=mesh.geometry.attributes.position;for(let i=0;i<position.count;i++){mesh.getVertexPosition(i,point);mesh.localToWorld(point);if(point.z>=bounds.max.z-height*.09&&point.y>bounds.min.y+height*.25){mouth.add(point);count++;}}});
 if(count)mouth.multiplyScalar(1/count);else mouth.set((bounds.min.x+bounds.max.x)/2,bounds.min.y+height*.7,bounds.max.z);
 const head=visual.getObjectByName('Head')||visual.getObjectByName('Mouth')||visual,anchor=new Object3D();anchor.name='BarkMouthAnchor';anchor.position.copy(head.worldToLocal(mouth));head.add(anchor);return{clip,anchor,head,jaw:visual.getObjectByName('Mouth')||visual.getObjectByName('Jaw')};
}

// A floor-relative shear moves the chest/head forward while keeping the paws on
// the same floor plane. Never add the attack clip's jump or any upward impulse.
export function applyGroundedBark(lean,pulse){
 const k=pulse*.22,s=1-pulse*.025,floor=.06;
 lean.matrixAutoUpdate=false;lean.matrix.set(1,0,0,0,0,s,0,floor*(1-s),0,k,1,-floor*k,0,0,0,1);
 lean.matrixWorldNeedsUpdate=true;
}

// Split the original muzzle along its lip seam. The lower jaw retains the
// original geometry, UVs and material; no substitute sphere covers the nose.
export function prepareNaturalJaw(root,visual,head,height,key){
 if(!['shiba','husky','pug','becgie'].includes(key))return null;
 root.updateMatrixWorld(true);const bounds=new Box3().setFromObject(visual),point=new Vector3(),nose=new Box3();
 visual.traverse(m=>{if(m.isMesh)for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,point);m.localToWorld(point);if(point.z>bounds.max.z-height*.025)nose.expandByPoint(point);}});
 const lipY=nose.max.y-height*(key==='pug'?.11:.055),hingeZ=bounds.max.z-height*.16,pivot=new Vector3(0,lipY,hingeZ),mount=new Group(),jaw=new Group(),owned=[],lip=[];
 mount.name='NaturalMouth';mount.position.copy(head.worldToLocal(pivot.clone()));mount.quaternion.copy(head.getWorldQuaternion(new Quaternion()).invert());const scale=head.getWorldScale(new Vector3());mount.scale.set(1/scale.x,1/scale.y,1/scale.z);head.add(mount);mount.add(jaw);
 const interpolate=(a,b,t)=>{const v={p:a.p.clone().lerp(b.p,t),a:{}};for(const name of Object.keys(a.a)){if(name==='skinIndex'||name==='skinWeight')continue;v.a[name]=a.a[name].map((n,i)=>n+(b.a[name][i]-n)*t);}if(a.a.skinIndex){const weights=new Map();for(const [vertex,factor] of [[a,1-t],[b,t]])vertex.a.skinIndex.forEach((id,i)=>weights.set(id,(weights.get(id)||0)+vertex.a.skinWeight[i]*factor));const top=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4);while(top.length<4)top.push([0,0]);const total=top.reduce((s,p)=>s+p[1],0)||1;v.a.skinIndex=top.map(p=>p[0]);v.a.skinWeight=top.map(p=>p[1]/total);}return v;};
 const clip=(poly,distance)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a.p),db=distance(b.p);if(da>=0)out.push(a);if((da>=0)!==(db>=0))out.push(interpolate(a,b,da/(da-db)));}return out;};
 const triangles=(poly,out)=>{for(let i=1;i+1<poly.length;i++)out.push(poly[0],poly[i],poly[i+1]);};
 const meshes=[];visual.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});
 for(const mesh of meshes){
  const geometry=mesh.geometry,attrs=geometry.attributes,vertices=[],upper=[],lower=[],index=geometry.index;
  for(let i=0;i<attrs.position.count;i++){const a={};for(const [name,attr] of Object.entries(attrs)){a[name]=Array.from({length:attr.itemSize},(_,j)=>attr.array[i*attr.itemSize+j]);}mesh.getVertexPosition(i,point);mesh.localToWorld(point);vertices.push({p:point.clone(),a});}
  const chinFloor=lipY-height*.12;
  for(let i=0;i<(index?.count||vertices.length);i+=3){const poly=[0,1,2].map(j=>vertices[index?index.getX(i+j):i+j]);if(!poly.some(v=>v.p.z>hingeZ&&v.p.y<lipY&&v.p.y>chinFloor)){triangles(poly,upper);continue;}triangles(clip(poly,p=>hingeZ-p.z),upper);const front=clip(poly,p=>p.z-hingeZ);triangles(clip(front,p=>p.y-lipY),upper);const below=clip(front,p=>lipY-p.y);triangles(clip(below,p=>chinFloor-p.y),upper);const chin=clip(below,p=>p.y-chinFloor);triangles(chin,lower);for(const v of chin)if(Math.abs(v.p.y-lipY)<height*1e-5)lip.push(v.p.clone().sub(pivot));}
  if(!lower.length)continue;
  const top=new BufferGeometry();for(const [name,attr] of Object.entries(attrs)){const Type=attr.array.constructor;top.setAttribute(name,new attr.constructor(new Type(upper.flatMap(v=>v.a[name])),attr.itemSize,attr.normalized));}top.computeBoundingSphere();mesh.geometry=top;owned.push(top);
  const bottom=new BufferGeometry();bottom.setAttribute('position',new Float32BufferAttribute(lower.flatMap(v=>v.p.clone().sub(pivot).toArray()),3));for(const name of ['uv','color'])if(attrs[name])bottom.setAttribute(name,new Float32BufferAttribute(lower.flatMap(v=>v.a[name]),attrs[name].itemSize));bottom.computeVertexNormals();const lowerMesh=new Mesh(bottom,mesh.material);lowerMesh.castShadow=true;lowerMesh.receiveShadow=true;jaw.add(lowerMesh);owned.push(bottom);
 }
 // A fitted lining joins the two real lip contours, staying inside the muzzle.
 const pts=[...new Map(lip.map(p=>[p.x.toFixed(5)+','+p.z.toFixed(5),p])).values()].sort((a,b)=>a.x-b.x||a.z-b.z),cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
 const half=items=>{const h=[];for(const p of items){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}h.pop();return h;},contour=[...half(pts),...half([...pts].reverse())];
 const liningGeometry=new BufferGeometry(),liningMaterial=new MeshStandardMaterial({color:'#281a18',roughness:1,side:DoubleSide}),lining=new Mesh(liningGeometry,liningMaterial);liningGeometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(contour.length*18),3));mount.add(lining);owned.push(liningGeometry);
 const soundAnchor=new Object3D();soundAnchor.name='NaturalLipSoundAnchor';mount.add(soundAnchor);const tip=bounds.max.z-hingeZ;
 let previousPulse;
 const update=pulse=>{if(pulse===previousPulse)return;previousPulse=pulse;const angle=pulse*.32;jaw.rotation.x=angle;soundAnchor.position.set(0,-tip*Math.sin(angle)*.5,tip*(1+Math.cos(angle))*.5);const a=liningGeometry.attributes.position;let n=0;for(let i=0;i<contour.length;i++){const p=contour[i],q=contour[(i+1)%contour.length],lo=v=>new Vector3(v.x,-v.z*Math.sin(angle),v.z*Math.cos(angle));for(const v of [p,q,lo(q),p,lo(q),lo(p)])a.setXYZ(n++,v.x,v.y,v.z);}a.needsUpdate=true;liningGeometry.computeVertexNormals();liningGeometry.computeBoundingSphere();lining.visible=pulse>.01;};
 update(0);return{mount,jaw,update,owned,liningMaterial,contour,lipY,hingeZ,soundAnchor};
}

// Keep fitting transforms outside the animated scene and its skeleton.
export function fitModel(scene, key, height) {
 const fitted=new Group();fitted.add(scene);scene.updateMatrixWorld(true);
 const bounds=new Box3().setFromObject(scene),size=bounds.getSize(new Vector3());
 if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Model không có kích thước hợp lệ: '+key);
 const scale=height/size.y,length=key==='corgi'?1.45:1;
 // All current quadrupeds face +Z. Corgi gains length, keeping short legs and width.
 fitted.scale.set(scale,scale,scale*length);
 fitted.position.set(-(bounds.max.x+bounds.min.x)*.5*scale,-bounds.min.y*scale+.06,-(bounds.max.z+bounds.min.z)*.5*scale*length);
 return fitted;
}

export function requireModelTextures(model, key) {
 let textured=0;
 model.scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   const ref=model.parser.associations.get(material),source=model.parser.json.materials?.[ref?.materials];
   if(source?.pbrMetallicRoughness?.baseColorTexture){
    if(!material.map?.image)throw new Error('Không tải được màu model '+key+'. Hãy tải lại trang.');
    textured++;
   }
  }
 });
 return textured;
}
