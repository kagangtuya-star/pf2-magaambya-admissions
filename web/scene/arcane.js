import * as T from '../vendor/three.module.js';
import {seeded} from '../lib/state.js';

// Procedural, non-cultural glyphs: short strokes inside a cell, seeded so every build draws the same sigil.
function glyph(ctx,random,w,h){
 const strokes=2+Math.floor(random()*3);ctx.beginPath();
 for(let i=0;i<strokes;i++){
  const x1=(random()-.5)*w,y1=(random()-.5)*h,x2=(random()-.5)*w,y2=(random()-.5)*h;
  if(random()<.35){ctx.moveTo(x1+w*.12,y1);ctx.arc(x1,y1,w*.12,0,Math.PI*2);}else{ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);}
 }
 ctx.stroke();
}
function sigilTexture(){
 const size=1024,c=size/2,R=c-8,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d'),random=seeded(1469);ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineCap='round';ctx.lineJoin='round';
 const ring=(r,w)=>{ctx.lineWidth=w;ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.stroke();};
 ring(R*.985,5);ring(R*.945,2);ring(R*.8,2);ring(R*.775,4);ring(R*.62,3);ring(R*.3,2);ring(R*.12,3);
 for(let i=0;i<180;i++){const a=i/180*Math.PI*2,long=i%10===0,r0=R*(long?.9:.948),r1=R*.982;ctx.lineWidth=long?3:1.5;ctx.beginPath();ctx.moveTo(c+Math.cos(a)*r0,c+Math.sin(a)*r0);ctx.lineTo(c+Math.cos(a)*r1,c+Math.sin(a)*r1);ctx.stroke();}
 ctx.lineWidth=3;
 for(let i=0;i<36;i++){const a=i/36*Math.PI*2;ctx.save();ctx.translate(c+Math.cos(a)*R*.862,c+Math.sin(a)*R*.862);ctx.rotate(a+Math.PI/2);glyph(ctx,random,R*.07,R*.085);ctx.restore();}
 // Five branches, one community: five nodes joined as a pentagon and a star.
 const nodes=[...Array(5)].map((_,i)=>{const a=-Math.PI/2+i/5*Math.PI*2;return[c+Math.cos(a)*R*.5,c+Math.sin(a)*R*.5];});
 ctx.lineWidth=3;ctx.beginPath();nodes.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();
 ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=5;i++){const [x,y]=nodes[(i*2)%5];i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
 for(const [x,y] of nodes){ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,R*.075,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,R*.045,0,Math.PI*2);ctx.stroke();ctx.save();ctx.translate(x,y);glyph(ctx,random,R*.05,R*.05);ctx.restore();}
 for(let i=0;i<5;i++){const a=-Math.PI/2+i/5*Math.PI*2;ctx.save();ctx.translate(c,c);ctx.rotate(a);ctx.beginPath();ctx.moveTo(0,-R*.13);ctx.bezierCurveTo(-R*.05,-R*.17,-R*.05,-R*.25,0,-R*.29);ctx.bezierCurveTo(R*.05,-R*.25,R*.05,-R*.17,0,-R*.13);ctx.lineWidth=2.5;ctx.stroke();ctx.restore();}
 const tex=new T.CanvasTexture(canvas);tex.anisotropy=4;return tex;
}
function bandTexture(){
 const w=2048,h=128,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),random=seeded(733);
 ctx.strokeStyle='#fff';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=2;
 for(const y of [10,h-10]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 ctx.lineWidth=4;for(let i=0;i<48;i++){ctx.save();ctx.translate((i+.5)*w/48,h/2);glyph(ctx,random,30,52);ctx.restore();}
 const tex=new T.CanvasTexture(canvas);tex.wrapS=T.RepeatWrapping;return tex;
}
const output='#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';
function glowMaterial(uniforms,vertexShader,fragmentShader,side=T.FrontSide){return new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side,toneMapped:false});}

export class ArcaneSigil {
 constructor(scene){
  this.root=new T.Group();this.root.name='arcane-sigil';scene.add(this.root);
  this.textures=[sigilTexture(),bandTexture()];
  this.uniforms={uTime:{value:0},uLevel:{value:0},uBurst:{value:0},uHover:{value:0}};
  const uv='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  this.floor=new T.Mesh(new T.PlaneGeometry(8,8),glowMaterial({...this.uniforms,tMap:{value:this.textures[0]}},uv,`
   uniform sampler2D tMap;uniform float uTime,uLevel,uBurst,uHover;varying vec2 vUv;
   vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}
   void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec2 q=p/.75;float inside=step(r,.75);
    float split=step(.62*.75,r);
    float outer=texture2D(tMap,rot(q,uTime*.045)+.5).a*split;
    float inner=texture2D(tMap,rot(q,-uTime*.07)+.5).a*(1.-split);
    float theta=atan(p.y,p.x);float sweep=pow(.5+.5*cos(theta-uTime*1.1),10.);
    float pulse=.82+.18*sin(uTime*2.1);
    float level=uLevel+uHover*.25;
    vec3 gold=vec3(1.,.66,.3),jade=vec3(.36,.92,.74);
    vec3 col=(gold*outer+jade*inner)*(.5+level*1.6+sweep*1.4*level)*pulse;
    float halo=smoothstep(.75,0.,r)*.05*level;
    float wave=uBurst>0.?exp(-pow((r-uBurst)*12.,2.))*(1.-uBurst)*2.4:0.;
    float alpha=((outer+inner)*inside*(.12+.88*level)+halo+wave)*min(1.,.2+level);
    gl_FragColor=vec4(col*inside+gold*(halo*6.+wave*1.6),alpha);
    ${output}}`));
  this.floor.rotation.x=-Math.PI/2;this.floor.position.y=.29;this.floor.renderOrder=2;this.root.add(this.floor);
  this.band=new T.Mesh(new T.CylinderGeometry(1.95,1.95,.4,96,1,true),glowMaterial({...this.uniforms,tMap:{value:this.textures[1]}},uv,`
   uniform sampler2D tMap;uniform float uTime,uLevel;varying vec2 vUv;
   void main(){float g=texture2D(tMap,vec2(vUv.x*3.-uTime*.05,vUv.y)).a;float edge=smoothstep(0.,.3,vUv.y)*smoothstep(1.,.7,vUv.y);float shimmer=.55+.45*sin(vUv.x*37.7-uTime*2.6);float level=smoothstep(.3,.9,uLevel);
    gl_FragColor=vec4(vec3(1.,.74,.38)*(1.2+g),(g*shimmer*.85+edge*.05)*level);
    ${output}}`,T.DoubleSide));
  this.band.position.y=2.12;this.band.renderOrder=3;this.root.add(this.band);
  this.beamUniforms={uTime:this.uniforms.uTime,uLevel:{value:0}};
  this.beam=new T.Mesh(new T.CylinderGeometry(.82,1.28,3.6,48,1,true),glowMaterial(this.beamUniforms,'varying vec2 vUv;varying float vRim;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vRim=abs(dot(normalize(normalMatrix*normal),normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}',`
   uniform float uTime,uLevel;varying vec2 vUv;varying float vRim;
   void main(){float fall=pow(1.-vUv.y,1.7);float streak=.55+.45*sin(vUv.x*75.4+uTime*1.7)*sin(vUv.x*31.4-uTime*.9+vUv.y*6.);float soft=pow(vRim,1.8);
    gl_FragColor=vec4(vec3(1.,.8,.5)*1.4,fall*soft*streak*uLevel*.68);
    ${output}}`,T.DoubleSide));
  this.beam.position.y=1.77+1.8;this.beam.renderOrder=4;this.root.add(this.beam);
  this.light=new T.PointLight(0xffc27a,0,7,2);this.light.position.set(0,2.55,0);this.root.add(this.light);
  this.level=0;this.target=0;this.hover=0;this.burstAt=0;
 }
 burst(delay=0){this.burstAt=performance.now()+delay;}
 // Returns true while the sigil still needs frames to settle.
 update(dt,time,now,{lift=0,reduced=false}={}){
  const k=reduced?1:1-Math.exp(-dt*2.6);this.level+=(this.target-this.level)*k;this.uniforms.uHover.value+=(this.hover-this.uniforms.uHover.value)*(reduced?1:1-Math.exp(-dt*6));
  let burst=0;if(this.burstAt&&!reduced){const t=(now-this.burstAt)/1500;if(t>=1)this.burstAt=0;else if(t>0)burst=1-Math.pow(1-t,2.2);}
  this.uniforms.uTime.value=time;this.uniforms.uLevel.value=this.level;this.uniforms.uBurst.value=burst;
  this.beamUniforms.uLevel.value=this.level*T.MathUtils.smoothstep(lift,.1,.8);
  this.band.rotation.y=-time*.18;this.band.visible=this.level>.3;this.beam.visible=this.beamUniforms.uLevel.value>.01;
  this.light.intensity=this.level*9*(1+.07*Math.sin(time*9.3)+.05*Math.sin(time*4.1))+(burst>0?(1-burst)*7:0);
  return Math.abs(this.target-this.level)>.004||Math.abs(this.hover-this.uniforms.uHover.value)>.004||this.burstAt>0;
 }
 dispose(){this.textures.forEach(t=>t.dispose());}
}
