import * as THREE from 'three';
function material(color, extra={}) {return new THREE.MeshStandardMaterial({color,roughness:.92,...extra});}
function box(parent,w,h,d,x,y,z,color) {const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function textTexture(text, fg='#f8edcc', bg='#3f5948') {
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.font='bold 54px Segoe UI, Arial';ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64,490);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function populateWorld(scene,arenaGroup){
  scene.add(new THREE.HemisphereLight(0xfff5da,0x70845c,3));
  const sun=new THREE.DirectionalLight(0xffdfae,4);sun.position.set(-7,13,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:50});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);
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
}
