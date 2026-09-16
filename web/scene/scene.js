import * as T from '../vendor/three.module.js';
import {makeMaterials} from './textures.js';
import {buildChest,buildEnvelope,buildDesk} from './models.js';
import {buildCourtyard} from './courtyard.js';
import {Rainwater} from './water.js';
import {CourtyardCompositor} from './compositor.js';
import {batchStatic} from './batch.js';
import {seeded,ease} from '../lib/state.js';

const views={
 sky:{eye:[2.8,16.8,23.8],look:[-.35,2.35,-.2],open:0,lift:0,unfold:0},
 arrival:{eye:[9.3,6.1,13.8],look:[-2.35,2.5,-1.1],open:0,lift:0,unfold:0},
 chest:{eye:[4.45,4.1,7.25],look:[-.88,2.17,0],open:0,lift:0,unfold:0},
 letter:{eye:[3.25,3.75,5.9],look:[-.65,3.01,.2],open:1,lift:1,unfold:0},
 invitation:{eye:[3.25,3.8,6.5],look:[-.7,3.15,.1],open:1,lift:1,unfold:1},
 writing:{eye:[4.2,7.4,7.7],look:[0,1.8,0],open:1,lift:0,unfold:1},
 review:{eye:[4.2,7.4,7.7],look:[0,1.8,0],open:1,lift:0,unfold:1},
 receipt:{eye:[7.8,5.9,11.5],look:[-1.7,2.6,-.4],open:0,lift:0,unfold:0}
};
function environment(renderer){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d'),g=ctx.createLinearGradient(0,0,0,512);
 g.addColorStop(0,'#a2b5ac');g.addColorStop(.42,'#c8c9ad');g.addColorStop(.62,'#617768');g.addColorStop(1,'#222e25');ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);
 const light=ctx.createRadialGradient(730,160,2,730,160,150);light.addColorStop(0,'rgba(255,226,171,1)');light.addColorStop(.3,'rgba(243,226,180,.75)');light.addColorStop(1,'rgba(243,226,180,0)');ctx.fillStyle=light;ctx.fillRect(0,0,1024,512);
 const tex=new T.CanvasTexture(canvas);tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.SRGBColorSpace;
 const pmrem=new T.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(tex);pmrem.dispose();tex.dispose();return target;
}
function clamp01(v){return Math.min(1,Math.max(0,v));}
function smooth01(v){return T.MathUtils.smoothstep(clamp01(v),0,1);}
function poseFromView(view){return {eye:new T.Vector3(...view.eye),look:new T.Vector3(...view.look),open:view.open,lift:view.lift,unfold:view.unfold};}
function blendPose(a,b,t){return {eye:a.eye.clone().lerp(b.eye,t),look:a.look.clone().lerp(b.look,t),open:T.MathUtils.lerp(a.open,b.open,t),lift:T.MathUtils.lerp(a.lift,b.lift,t),unfold:T.MathUtils.lerp(a.unfold,b.unfold,t)};}
function profileFor(from,to,reduced=false){
 if(reduced)return {name:'instant',duration:0};
 const key=`${from}->${to}`;
 if(key==='arrival->chest')return {name:'approach',duration:3200};
 if(key==='chest->letter')return {name:'unlock',duration:2800};
 if(key==='letter->invitation')return {name:'unseal',duration:2400};
 if((from==='invitation'||from==='letter'||from==='chest')&&to==='writing')return {name:'folio',duration:1700};
 if(key==='review->receipt')return {name:'release',duration:1800};
 return {name:'default',duration:to==='letter'?2400:to==='invitation'?1900:1700};
}
export class RaincourtScene {
 constructor(container,{quality='balanced',reduced=false,onActivate=()=>{},onFailure=()=>{}}={}){
  this.container=container;this.quality=quality;this.reduced=reduced;this.onActivate=onActivate;this.onFailure=onFailure;this.phase='arrival';this.disposed=false;this.hidden=document.hidden;this.time=0;this.last=0;this.frame=0;this.raf=0;this.motion=null;this.resolveMotion=null;this.pointer=new T.Vector2();this.parallax=new T.Vector2();this.hasPointer=false;
  this.landingProgress=0;
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',stencil:false});
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
  this.renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{console.error('Raincourt shader compilation failed.',gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment));this.renderFault=true;};
  this.renderer.shadowMap.enabled=quality!=='low';this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.renderer.setClearColor(0x26423a);this.renderer.domElement.setAttribute('aria-hidden','true');container.append(this.renderer.domElement);
  this.scene=new T.Scene();this.scene.background=new T.Color(0x26423a);this.scene.fog=new T.FogExp2(0x26423a,.026);this.env=environment(this.renderer);this.scene.environment=this.env.texture;this.scene.environmentIntensity=.73;
  this.camera=new T.PerspectiveCamera(43,1,.1,100);this.look=new T.Vector3(...views.arrival.look);this.camera.position.set(...views.arrival.eye);this.camera.lookAt(this.look);
  this.materials=makeMaterials();this.courtyard=buildCourtyard(this.materials,quality);this.scene.add(this.courtyard.root);
  this.desk=buildDesk(this.materials);this.desk.position.y=.3;this.scene.add(this.desk);this.chest=buildChest(this.materials);this.chest.root.position.y=1.77;this.scene.add(this.chest.root);
  this.envelope=buildEnvelope(this.materials);this.envelope.root.position.set(0,2.04,0);this.envelope.root.rotation.x=-Math.PI/2;this.envelope.root.scale.setScalar(.9);this.scene.add(this.envelope.root);this.batchStats=[batchStatic(this.courtyard.root),batchStatic(this.desk),batchStatic(this.chest.root,[this.chest.lid]),batchStatic(this.chest.lid),batchStatic(this.envelope.root,[this.envelope.flap,this.envelope.letter,this.envelope.seal])];this.values={open:0,lift:0,unfold:0};
  this.scene.add(new T.HemisphereLight(0xd3dec3,0x2d3527,2.0));const sun=new T.DirectionalLight(0xffdfa6,3.1);sun.position.set(7,12,7);sun.castShadow=true;sun.shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);sun.shadow.camera.left=-11;sun.shadow.camera.right=11;sun.shadow.camera.top=11;sun.shadow.camera.bottom=-11;sun.shadow.camera.near=1;sun.shadow.camera.far=35;sun.shadow.bias=-.0002;sun.shadow.normalBias=.03;this.sun=sun;this.scene.add(sun);const fill=new T.DirectionalLight(0xaad4c4,.8);fill.position.set(-5,6,-8);this.scene.add(fill);
  this.water=new Rainwater(this.renderer,this.scene,quality);this.compositor=new CourtyardCompositor(this.renderer);this.compositor.enabled=quality==='high';this.makeMotes();
  this.raycaster=new T.Raycaster();this.ndc=new T.Vector2();this.hit=null;
  this.onMove=e=>{this.pointer.set((e.clientX/window.innerWidth-.5)*2,(e.clientY/window.innerHeight-.5)*2);this.hasPointer=true;this.ndc.copy(this.pointer);this.ndc.y*=-1;this.raycaster.setFromCamera(this.ndc,this.camera);const targets=this.phase==='letter'?[this.envelope.seal]:[this.chest.root];this.hit=this.raycaster.intersectObjects(targets,true)[0];this.renderer.domElement.style.cursor=this.hit?'pointer':'default';};
  this.onClick=e=>{this.onMove(e);if(this.hit&&['arrival','chest','letter'].includes(this.phase))this.onActivate(this.phase);};
  this.onLost=e=>{e.preventDefault();this.stop();container.classList.remove('is-ready');this.onFailure('context-lost');};
  this.onRestored=()=>this.onFailure('context-restored');
  this.renderer.domElement.addEventListener('pointermove',this.onMove);this.renderer.domElement.addEventListener('click',this.onClick);this.renderer.domElement.addEventListener('webglcontextlost',this.onLost);this.renderer.domElement.addEventListener('webglcontextrestored',this.onRestored);
  this.tick=this.tick.bind(this);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  this.visibility=()=>{this.hidden=document.hidden;if(this.hidden)this.stop();else this.start();};document.addEventListener('visibilitychange',this.visibility);
  this.applyPose(this.phase==='arrival'?this.landingPose(this.landingProgress):this.captureTarget('arrival'));this.start();
 }
 captureCurrentPose(){return {eye:this.camera.position.clone(),look:this.look.clone(),open:this.values.open,lift:this.values.lift,unfold:this.values.unfold};}
 captureTarget(name){return poseFromView(this.targetView(name));}
 makeMotes(){
  const random=seeded(812),positions=new Float32Array(96*3);for(let i=0;i<96;i++){positions[i*3]=(random()-.5)*16;positions[i*3+1]=random()*7;positions[i*3+2]=(random()-.5)*13;}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uTime:{value:0},uRatio:{value:1}},vertexShader:'uniform float uTime,uRatio;varying float vFade;void main(){vec3 p=position;p.x+=sin(uTime*.2+position.z)*.08;p.y+=sin(uTime*.3+position.x)*.06;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(18./-mv.z,1.,3.)*uRatio;vFade=.08+.1*sin(position.x*3.+uTime*.4);}',fragmentShader:'varying float vFade;void main(){float a=1.-smoothstep(.08,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.85,.72,.4,a*vFade);}'});this.motes=new T.Points(geometry,material);this.scene.add(this.motes);
 }
 resize(){
  if(this.disposed)return;const w=this.container.clientWidth||innerWidth,h=this.container.clientHeight||innerHeight,ratio=Math.min(devicePixelRatio||1,this.quality==='high'?1.8:this.quality==='low'?1:1.35);this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.fov=w<680?53:43;this.camera.updateProjectionMatrix();this.compositor.resize(w,h,ratio);this.motes.material.uniforms.uRatio.value=ratio;
  if(!this.motion)this.applyPose(this.phase==='arrival'?this.landingPose(this.landingProgress):this.captureTarget(this.phase));this.start();
 }
 targetView(name){const target={...views[name],eye:[...views[name].eye],look:[...views[name].look]};if(this.container.clientWidth<680){target.look[0]=0;target.eye[0]*=.78;target.eye[2]*=1.12;if(name==='sky'){target.eye[1]=18.2;target.eye[2]=27.5;target.look[1]=2.5;}if(name==='arrival'){target.eye[1]=6.3;target.look[1]=3.1;}if(name==='letter'||name==='invitation'){target.look[1]=3.6;target.eye[1]=4.6;}if(name==='writing'||name==='review'){target.eye[1]=7.1;target.eye[2]=8.25;}}return target;}
 landingPose(progress){
  const start=poseFromView(this.targetView('sky')),end=poseFromView(this.targetView('arrival'));
  const t=ease(clamp01(progress)),settle=smooth01((progress-.52)/.48);const pose=blendPose(start,end,t);
  pose.eye.x=T.MathUtils.lerp(start.eye.x,end.eye.x,settle);
  pose.eye.y+=(1-t)*2.1;
  pose.eye.z+=(1-t)*4.8;
  pose.look.x=T.MathUtils.lerp(start.look.x,end.look.x,settle);
  pose.look.y=T.MathUtils.lerp(start.look.y,end.look.y,smooth01((progress-.18)/.82));
  pose.look.z=T.MathUtils.lerp(start.look.z,end.look.z,settle);
  return pose;
 }
 setLandingProgress(progress=1){
  this.landingProgress=clamp01(progress);
  if(this.phase==='arrival'&&!this.motion){this.applyPose(this.landingPose(this.landingProgress));this.start();}
 }
 applyPose(pose){
  this.camera.position.copy(pose.eye);this.look.copy(pose.look);this.values.open=pose.open;this.values.lift=pose.lift;this.values.unfold=pose.unfold;
  const tilt=smooth01((this.values.lift-.65)/.35),present=smooth01((this.values.lift-.9)/.1);
  this.camera.lookAt(this.look);this.chest.setOpen(this.values.open);this.envelope.root.visible=this.values.lift>.015||this.values.unfold>.01;this.envelope.root.position.set(0,2.04+this.values.lift*1.66,present*.38);this.envelope.root.rotation.set(-Math.PI/2*(1-tilt),present*.42,-present*.045);this.envelope.setOpen(this.values.unfold);
 }
 sampleMotion(t){
  const motion=this.motion,a=motion.from,b=motion.to,arc=Math.sin(t*Math.PI);let pose=blendPose(a,b,t);
  switch(motion.profile.name){
   case'approach':{
    const s=ease(t);pose=blendPose(a,b,s);pose.eye.x+=(1-s)*1.35-arc*.16;pose.eye.y+=arc*1.05;pose.eye.z+=arc*1.72;pose.look.x+=(1-s)*-.58;pose.look.y+=arc*.26;break;
   }
   case'unlock':{
    const s=ease(t);pose=blendPose(a,b,s);pose.open=smooth01((t-.04)/.42);pose.lift=smooth01((t-.46)/.48);pose.unfold=0;pose.eye.y+=arc*.45;pose.eye.z+=(1-s)*.55-arc*.18;pose.look.y+=smooth01((t-.24)/.72)*.2;break;
   }
   case'unseal':{
    const s=ease(t);pose=blendPose(a,b,s);pose.open=1;pose.lift=1;pose.unfold=smooth01((t-.12)/.74);pose.eye.x+=(1-s)*.22;pose.eye.y+=arc*.3;pose.eye.z-=smooth01((t-.16)/.8)*.62;pose.look.y+=smooth01((t-.36)/.64)*.15;break;
   }
   case'folio':{
    const s=ease(t);pose=blendPose(a,b,s);pose.eye.y+=arc*.36;pose.eye.z-=smooth01((t-.18)/.76)*.35;pose.lift=T.MathUtils.lerp(a.lift,b.lift,smooth01((t-.08)/.92));pose.unfold=1;break;
   }
   case'release':{
    const s=ease(t);pose=blendPose(a,b,s);pose.eye.y+=arc*.55;pose.eye.z+=arc*.9;pose.open=T.MathUtils.lerp(a.open,b.open,smooth01((t-.08)/.72));pose.lift=T.MathUtils.lerp(a.lift,b.lift,smooth01((t-.02)/.52));pose.unfold=T.MathUtils.lerp(a.unfold,b.unfold,smooth01((t-.02)/.4));break;
   }
   default:{
    const s=ease(t);pose=blendPose(a,b,s);if(b.lift>a.lift)pose.lift=T.MathUtils.lerp(a.lift,b.lift,smooth01((t-.15)/.85));
   }
  }
  const enter=smooth01(t/.12);
  pose=blendPose(a,pose,enter);
  const settleStart=motion.profile.name==='unseal'?.72:.84;
  const settle=smooth01((t-settleStart)/(1-settleStart));
  return blendPose(pose,b,settle);
 }
 go(name,{instant=false,profile=null}={}){
  if(!views[name]||this.disposed)return Promise.resolve();this.resolveMotion?.();const fromPhase=this.phase;const chosen=instant||this.reduced?{name:'instant',duration:0}:profile?{name:profile,duration:profileFor(fromPhase,name,false).duration}:profileFor(fromPhase,name,this.reduced);this.phase=name;
  const promise=new Promise(resolve=>this.resolveMotion=resolve);this.motion={from:this.captureCurrentPose(),to:this.captureTarget(name),profile:chosen,at:performance.now(),duration:chosen.duration};if(chosen.duration===0){this.applyPose(this.motion.to);this.motion=null;this.resolveMotion?.();this.resolveMotion=null;return Promise.resolve();}this.start();return promise;
 }
 tick(now){
  if(this.disposed||this.hidden)return;this.raf=0;const dt=Math.min(.05,(now-(this.last||now))/1000);this.last=now;const reading=['writing','review'].includes(this.phase);
  if(!this.reduced&&!reading)this.time+=dt;
  const wasMoving=Boolean(this.motion);let settled=!this.motion;
  if(this.motion){const t=this.motion.duration===0?1:Math.min(1,(now-this.motion.at)/this.motion.duration);this.applyPose(this.sampleMotion(clamp01(t)));if(t===1){this.applyPose(this.motion.to);this.parallax.set(0,0);this.motion=null;settled=true;this.resolveMotion?.();this.resolveMotion=null;}}
  else if(!this.reduced&&!reading){
   this.parallax.lerp(this.pointer,.025);
   if(this.phase==='arrival'){
    const pose=this.landingPose(this.landingProgress),weight=.35+this.landingProgress*.65;
    pose.eye.x+=this.parallax.x*.14*weight;pose.eye.y-=this.parallax.y*.08*weight;pose.look.x+=this.parallax.x*.05*weight;pose.look.y-=this.parallax.y*.03*weight;
    this.applyPose(pose);
   }else{
    const v=this.targetView(this.phase);this.camera.position.set(v.eye[0]+this.parallax.x*.13,v.eye[1]-this.parallax.y*.075,v.eye[2]);this.camera.lookAt(this.look);
   }
  }
  this.courtyard.vegetation.time.value=this.time;this.motes.material.uniforms.uTime.value=this.time;
  this.renderer.shadowMap.autoUpdate=wasMoving||this.frame<2;
  try{this.water.update(this.camera,this.time,!reading);this.compositor.render(this.scene,this.camera,this.time,this.camera.position.distanceTo(this.look));if(this.renderFault)throw new Error('A scene shader could not be compiled.');}catch(error){console.error('Raincourt render failed.',error);this.stop();this.resolveMotion?.();this.resolveMotion=null;this.onFailure('render-failed');return;}this.frame++;
  if(this.frame>=1)this.container.classList.add('is-ready');
  if(!settled||(!reading&&!this.reduced))this.raf=requestAnimationFrame(this.tick);
 }
 start(){if(this.disposed||this.hidden||this.raf)return;this.last=0;this.raf=requestAnimationFrame(this.tick);} 
 stop(){cancelAnimationFrame(this.raf);this.raf=0;this.last=0;}
 configure({quality=this.quality,reduced=this.reduced}){this.quality=quality;this.reduced=reduced;this.courtyard.vegetation.leaves.count=quality==='low'?650:1550;const shadowSize=quality==='high'?2048:1024;if(this.sun.shadow.mapSize.x!==shadowSize){this.sun.shadow.mapSize.set(shadowSize,shadowSize);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;}this.sun.shadow.needsUpdate=true;this.frame=0;this.water.setQuality(quality);this.compositor.enabled=quality==='high';this.renderer.shadowMap.enabled=quality!=='low';this.resize();this.go(this.phase,{instant:true});}
 stats(){return{revision:T.REVISION,batching:this.batchStats,phase:this.phase,quality:this.quality,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures};}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.stop();this.resolveMotion?.();this.resizeObserver.disconnect();document.removeEventListener('visibilitychange',this.visibility);
  const canvas=this.renderer.domElement;canvas.removeEventListener('pointermove',this.onMove);canvas.removeEventListener('click',this.onClick);canvas.removeEventListener('webglcontextlost',this.onLost);canvas.removeEventListener('webglcontextrestored',this.onRestored);
  const gs=new Set(),ms=new Set();this.scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());this.courtyard.vegetation.depth.dispose();this.materials.textures.forEach(t=>t.dispose());this.env.dispose();this.water.dispose();this.compositor.dispose();this.sun.shadow.dispose();this.renderer.dispose();this.renderer.forceContextLoss();canvas.remove();
 }
}
export function createScene(container,options){return new RaincourtScene(container,options);}
