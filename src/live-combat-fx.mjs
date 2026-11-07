import * as THREE from 'three';

const vertexShader=`
 attribute float aSize; attribute float aAlpha; attribute float aHeat;
 uniform float uPixelScale; varying float vAlpha; varying float vHeat;
 void main(){vAlpha=aAlpha;vHeat=aHeat;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(aSize*uPixelScale,1.,160.);}`;
const fragmentShader=`
 uniform float uTime;uniform float uMode;varying float vAlpha;varying float vHeat;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
 void main(){vec2 uv=gl_PointCoord*2.-1.;float r=length(uv*vec2(1.,.86));float n=noise(uv*3.5+vec2(vHeat*19.,-uTime*4.));n=.65*n+.35*noise(uv*7.+uTime*2.);float edge=1.-smoothstep(.25+n*.24,1.,r);float alpha=edge*vAlpha*(.58+n*.42);vec3 color=mix(vec3(1.,.12,.008),vec3(1.,.65,.08),vHeat);color=mix(color,vec3(1.,.97,.76),clamp((1.-r*2.)*vHeat,0.,1.));if(uMode>1.5){color=vec3(1.,.54,.12);alpha*=1.-smoothstep(.1,.8,r);}else if(uMode>.5){color=vec3(.22,.2,.18);alpha*=.24;}if(alpha<.01)discard;gl_FragColor=vec4(color,alpha);}`;

export function fireEffects(start,end){
 // One straight, narrow jet to one authoritative victim; smoke is cosmetic only.
 const curve=new THREE.LineCurve3(start.clone(),end.clone()),up=new THREE.Vector3(0,1,0);
 return [[112,0,'fire',1.35],[28,1,'smoke',1.65],[24,2,'embers',1.35]].map(([count,mode,type,life])=>{
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array(count*3),sizes=new Float32Array(count),alpha=new Float32Array(count),heat=new Float32Array(count);
  for(const [name,array,size] of [['position',positions,3],['aSize',sizes,1],['aAlpha',alpha,1],['aHeat',heat,1]])geometry.setAttribute(name,new THREE.BufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{uTime:{value:0},uPixelScale:{value:70},uMode:{value:mode}},transparent:true,depthWrite:false,depthTest:true,blending:THREE.NormalBlending});
  const mesh=new THREE.Points(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=mode===1?5:7;
  return {mesh,type,time:0,life,curve,target:end.clone(),update(dt,time,camera,renderer){
   material.uniforms.uTime.value=time;material.uniforms.uPixelScale.value=(renderer.domElement?.width||1080)/(camera.right-camera.left)*camera.zoom;
   const front=Math.min(1,time/.28),fade=THREE.MathUtils.clamp((life-time)/.45,0,1);
   for(let i=0;i<count;i++){
    const seed=(i*.61803398875)%1,travel=(seed+time*(.8+seed*.55))%1,p=mode===1?.9+seed*.1:travel,point=curve.getPoint(p),tangent=curve.getTangent(p).normalize(),right=new THREE.Vector3().crossVectors(tangent,up).normalize(),angle=i*2.39996+time*(mode===2?5:8),width=(.025+p*.08)*(mode===1?1.8:1),spin=Math.sin(time*12+i*1.7);
    point.addScaledVector(right,Math.cos(angle)*width*seed).addScaledVector(up,Math.sin(angle)*width+Math.sin(time*9+seed*15)*p*.07);
    if(mode===1){point.y+=time*.7;point.addScaledVector(right,Math.sin(time*2+i)*time*.22);}if(mode===2){point.y+=Math.sin(time*5+i)*.3;point.addScaledVector(right,spin*.2);}
    point.toArray(positions,i*3);sizes[i]=mode===1?.35+seed*.35:mode===2?.025+seed*.04:.12+seed*.18+p*.05;heat[i]=mode===1?.1:Math.max(.12,1-p*.85)+(i%4===0?.25:0);alpha[i]=(p<=front||mode===1&&front===1?1:0)*fade*(mode===1?.65:mode===2?.8:.85)*(mode===1?Math.min(1,time*2):1);
   }
   for(const key of ['position','aSize','aAlpha','aHeat'])geometry.attributes[key].needsUpdate=true;
  }};
 });
}

export function clawEffects(end){
 const effects=[];
 for(let i=0;i<3;i++)for(const [radius,color,order]of [[.105,'#d94722',23],[.038,'#fff7da',24]]){
  const d=(i-1)*.32,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.62+d,.98,0),new THREE.Vector3(-.08+d,.18,.02),new THREE.Vector3(.63+d,-.78,0)]),geometry=new THREE.TubeGeometry(curve,22,radius,7,false),material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthTest:false,depthWrite:false}),mesh=new THREE.Mesh(geometry,material);mesh.position.copy(end);mesh.renderOrder=order;mesh.frustumCulled=false;
  effects.push({mesh,type:'claw',time:0,life:1.9,target:end.clone(),update(dt,time,camera){const age=Math.max(0,time-i*.06),front=Math.min(1,age/.18);mesh.quaternion.copy(camera.quaternion);geometry.setDrawRange(0,Math.floor(geometry.index.count*front/3)*3);material.opacity=time<i*.06?0:Math.min(1,(1.9-time)/.55);}});
 }
 const geometry=new THREE.RingGeometry(.35,.48,48),material=new THREE.MeshBasicMaterial({color:'#ffd567',transparent:true,opacity:.85,depthTest:false,depthWrite:false}),mesh=new THREE.Mesh(geometry,material);mesh.position.copy(end);mesh.renderOrder=22;
 effects.push({mesh,type:'impact',time:0,life:.65,target:end.clone(),update(dt,time,camera){mesh.quaternion.copy(camera.quaternion);mesh.scale.setScalar(.8+time*2.6);material.opacity=Math.max(0,.85*(1-time/.65));}});return effects;
}
