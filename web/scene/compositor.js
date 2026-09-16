import * as T from '../vendor/three.module.js';
export class CourtyardCompositor {
 constructor(renderer){
  this.renderer=renderer;this.enabled=false;
  this.target=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true});
  this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tColor:{value:this.target.texture},tDepth:{value:this.target.depthTexture},uPixel:{value:new T.Vector2(1,1)},uTime:{value:0},uFocus:{value:12},uNear:{value:.1},uFar:{value:100}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
   uniform sampler2D tColor;uniform sampler2D tDepth;uniform vec2 uPixel;uniform float uTime,uFocus,uNear,uFar;varying vec2 vUv;
   float distanceAt(vec2 uv){float z=texture2D(tDepth,uv).r;return(uNear*uFar)/(uFar-z*(uFar-uNear));}
   void main(){float d=distanceAt(vUv);float coc=smoothstep(uFocus+3.,uFocus+17.,d)*2.4;vec3 base=texture2D(tColor,vUv).rgb;vec3 sum=base*.3;vec3 bloom=vec3(0.);float weights=.3;
    for(int i=0;i<10;i++){float angle=float(i)*2.399963;vec2 dir=vec2(cos(angle),sin(angle));vec2 offset=dir*uPixel*coc*(1.+float(i)*.11);vec3 sampleColor=texture2D(tColor,vUv+offset).rgb;float sd=distanceAt(vUv+offset);float weight=.07*(1.-step(3.,abs(sd-d))*.85);sum+=sampleColor*weight;weights+=weight;vec3 bright=texture2D(tColor,vUv+dir*uPixel*(3.+float(i)*.9)).rgb;bloom+=max(bright-vec3(1.12),vec3(0.))*.014;}
    vec3 color=sum/weights+bloom;float vignette=1.-.12*pow(length((vUv-.5)*vec2(1.05,.85)),1.7);color*=vignette;float grain=fract(sin(dot(vUv+fract(uTime*.1),vec2(12.9898,78.233)))*43758.5453)-.5;color+=grain*.0025;gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.scene.add(this.quad);
 }
 resize(w,h,ratio){this.target.setSize(Math.round(w*ratio),Math.round(h*ratio));this.material.uniforms.uPixel.value.set(1/(w*ratio),1/(h*ratio));}
 render(scene,camera,time,focus){const r=this.renderer;if(!this.enabled){r.setRenderTarget(null);r.render(scene,camera);return;}this.material.uniforms.uTime.value=time;this.material.uniforms.uFocus.value=focus;this.material.uniforms.uNear.value=camera.near;this.material.uniforms.uFar.value=camera.far;r.setRenderTarget(this.target);r.render(scene,camera);r.setRenderTarget(null);r.render(this.scene,this.camera);}
 dispose(){this.target.dispose();this.quad.geometry.dispose();this.material.dispose();}
}
