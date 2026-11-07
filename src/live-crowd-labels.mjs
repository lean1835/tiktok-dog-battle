import * as THREE from 'three';
export const NAMEPLATE_WIDTH=1.8,NAMEPLATE_HEIGHT=.45;
export const nameplateFill=bot=>bot?'#f5edcf':'#fffdf5';
export function drawName(ctx,name,x,y,width){const chars=Array.from(String(name).normalize('NFC'));let text=chars.join('');if(ctx.measureText){while(chars.length&&ctx.measureText(text).width>width){chars.pop();text=chars.join('')+'…';}}else if(chars.length>25)text=chars.slice(0,24).join('')+'…';ctx.fillText(text,x,y);}

// Batched viewers keep their own nameplates. One atlas draw per 128 names,
// independent of how many expensive animated rigs are currently featured.
export class CrowdLabels{
 constructor(group){this.group=group;this.pages=[];this.count=0;this.signature='';}
 set(entries){
  const signature=JSON.stringify(entries);if(signature===this.signature)return;this.signature=signature;this.count=entries.length;
  const pageCount=Math.ceil(entries.length/128);
  while(this.pages.length>pageCount)this.disposePage(this.pages.pop());
  for(let page=0;page<pageCount;page++){
   const rows=entries.slice(page*128,(page+1)*128),height=128*2**Math.ceil(Math.log2(Math.max(1,Math.ceil(rows.length/4))));
   let p=this.pages[page];if(!p){const canvas=document.createElement('canvas'),texture=new THREE.CanvasTexture(canvas),geometry=new THREE.PlaneGeometry(1,1),material=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{map:{value:texture}},vertexShader:`attribute vec4 labelRect; varying vec2 labelUv;
    void main(){labelUv=labelRect.xy+uv*labelRect.zw;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*center;}`,
    fragmentShader:`uniform sampler2D map; varying vec2 labelUv; void main(){gl_FragColor=texture2D(map,labelUv);if(gl_FragColor.a<.01)discard;
    #include <colorspace_fragment>
    }`});texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;const mesh=new THREE.InstancedMesh(geometry,material,128);mesh.frustumCulled=false;mesh.renderOrder=10;this.group.add(mesh);p={canvas,texture,geometry,material,mesh};this.pages.push(p);}
   // WebGL texture storage cannot change dimensions after upload. Arrivals can
   // cross an atlas row tier, so replace its texture before drawing the new UVs.
   if(p.canvas.width!==2048||p.canvas.height!==height){p.texture.dispose();p.canvas.width=2048;p.canvas.height=height;p.texture=new THREE.CanvasTexture(p.canvas);p.texture.colorSpace=THREE.SRGBColorSpace;p.texture.generateMipmaps=false;p.texture.minFilter=THREE.LinearFilter;p.material.uniforms.map.value=p.texture;}
   const ctx=p.canvas.getContext('2d');ctx.clearRect(0,0,2048,height);const rects=new Float32Array(rows.length*4),matrix=new THREE.Matrix4();
   rows.forEach((e,i)=>{const x=i%4*512,y=Math.floor(i/4)*128;ctx.fillStyle=nameplateFill(e.bot);ctx.beginPath();ctx.roundRect(x+4,y+4,504,120,14);ctx.fill();ctx.textAlign='center';ctx.fillStyle='#456042';ctx.font='700 52px Segoe UI, Arial, sans-serif';drawName(ctx,e.name,x+256,y+82,475);
    matrix.makeScale(NAMEPLATE_WIDTH,NAMEPLATE_HEIGHT,1);matrix.setPosition(e.x,.15+(e.height+.5)*e.scale,e.z);p.mesh.setMatrixAt(i,matrix);rects.set([(x+1)/2048,1-(y+127)/height,510/2048,126/height],i*4);
   });
   p.geometry.setAttribute('labelRect',new THREE.InstancedBufferAttribute(rects,4));p.mesh.count=rows.length;p.mesh.instanceMatrix.needsUpdate=true;p.texture.needsUpdate=true;
  }
 }
 disposePage(p){p.mesh.removeFromParent();p.mesh.dispose();p.geometry.dispose();p.material.dispose();p.texture.dispose();}
 dispose(){for(const p of this.pages)this.disposePage(p);this.pages=[];this.count=0;this.signature='';}
}
