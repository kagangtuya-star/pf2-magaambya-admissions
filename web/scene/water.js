import * as T from '../vendor/three.module.js';
export class Rainwater {
 constructor(renderer,scene,quality){
  this.renderer=renderer;this.scene=scene;this.height=-.055;this.camera=new T.PerspectiveCamera();
  this.target=new T.WebGLRenderTarget(quality==='high'?768:384,quality==='high'?768:384,{type:T.UnsignedByteType});
  this.matrix=new T.Matrix4();this.clip=new T.Plane(new T.Vector3(0,1,0),-this.height-.015);this.frame=0;this.enabled=quality!=='low';
  this.material=new T.ShaderMaterial({uniforms:{tReflection:{value:this.target.texture},uReflectionMatrix:{value:this.matrix},uTime:{value:0},uEye:{value:new T.Vector3()},uReflect:{value:this.enabled?1:0}},vertexShader:`varying vec3 vWorld;varying vec4 vProjected;uniform mat4 uReflectionMatrix;void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vProjected=uReflectionMatrix*world;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`
   uniform sampler2D tReflection;uniform float uTime;uniform float uReflect;uniform vec3 uEye;varying vec3 vWorld;varying vec4 vProjected;
   float waves(vec2 p){float v=sin(p.x*3.5+uTime*.9)*sin(p.y*2.7-uTime*.8)*.014;vec2 cell=floor(p*.65);vec2 q=fract(p*.65)-.5;float seed=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);float age=fract(uTime*.22+seed);float radius=length(q);v+=sin(radius*47.-age*23.)*exp(-radius*5.)*sin(age*3.14159)*.012;return v;}
   void main(){float a=waves(vWorld.xz),dx=waves(vWorld.xz+vec2(.03,0.))-a,dz=waves(vWorld.xz+vec2(0.,.03))-a;vec3 normal=normalize(vec3(-dx*12.,1.,-dz*12.));vec3 viewDir=normalize(uEye-vWorld);float fresnel=pow(1.-max(dot(viewDir,normal),0.),3.);vec2 uv=vProjected.xy/vProjected.w+vec2(dx,dz)*.36;vec3 reflection=texture2D(tReflection,clamp(uv,.002,.998)).rgb;vec3 color=mix(vec3(.045,.11,.091),reflection,.32+fresnel*.48);color=mix(vec3(.055,.14,.116)+a*.12,color,uReflect);float spec=pow(max(dot(reflect(-normalize(vec3(5.,10.,3.)),normal),viewDir),0.),170.);color+=vec3(.42,.32,.17)*spec;color=mix(color,vec3(.052,.108,.09),smoothstep(18.,47.,distance(uEye,vWorld))*.74);gl_FragColor=vec4(color,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`.replace(';#include',';\n#include')});
  this.mesh=new T.Mesh(new T.PlaneGeometry(70,70),this.material);this.mesh.rotation.x=-Math.PI/2;this.mesh.position.y=this.height;this.mesh.name='reflecting-rainwater';scene.add(this.mesh);
 }
 update(camera,time,refresh=true){
  this.material.uniforms.uTime.value=time;this.material.uniforms.uEye.value.copy(camera.position);
  if(!this.enabled||!refresh||(++this.frame%3!==0&&this.frame!==1))return;
  const r=this.renderer,oldTarget=r.getRenderTarget(),oldClip=r.clippingPlanes,oldAuto=r.shadowMap.autoUpdate;
  const virtual=this.camera;virtual.copy(camera,false);virtual.position.copy(camera.position);virtual.position.y=2*this.height-camera.position.y;
  const dir=camera.getWorldDirection(new T.Vector3()),target=camera.position.clone().add(dir);target.y=2*this.height-target.y;
  virtual.up.set(0,1,0).applyQuaternion(camera.quaternion);virtual.up.y*=-1;virtual.lookAt(target);virtual.updateMatrixWorld();virtual.projectionMatrix.copy(camera.projectionMatrix);
  this.matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(virtual.projectionMatrix).multiply(virtual.matrixWorldInverse);
  this.mesh.visible=false;r.clippingPlanes=[this.clip];r.shadowMap.autoUpdate=false;r.setRenderTarget(this.target);r.clear();r.render(this.scene,virtual);r.setRenderTarget(oldTarget);r.clippingPlanes=oldClip;r.shadowMap.autoUpdate=oldAuto;this.mesh.visible=true;
 }
 setQuality(q){this.enabled=q!=='low';this.material.uniforms.uReflect.value=this.enabled?1:0;const n=q==='high'?768:384;this.target.setSize(n,n);this.frame=0;}
 dispose(){this.mesh.geometry.dispose();this.material.dispose();this.target.dispose();}
}
