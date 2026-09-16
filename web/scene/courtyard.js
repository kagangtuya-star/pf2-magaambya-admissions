import * as T from '../vendor/three.module.js';
import {mesh,box,rounded,tube,crest} from './models.js';
import {seeded} from '../lib/state.js';

function lantern(root,m,x,y,z){
 const g=new T.Group();g.position.set(x,y,z);root.add(g);
 // Carry the suspension back to the beam instead of ending in open air.
 tube(g,[[x/.78-x,.98,0],[0,.98,0],[0,.5,0],[0,.28,0]],.014,m.oldBrass,8);
 mesh(new T.CylinderGeometry(.16,.25,.11,8),m.brass,g,[0,.26,0]);
 mesh(new T.CylinderGeometry(.18,.15,.34,8),m.light,g,[0,.02,0]);
 mesh(new T.CylinderGeometry(.23,.12,.08,8),m.oldBrass,g,[0,-.2,0]);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;tube(g,[[Math.cos(a)*.165,-.18,Math.sin(a)*.165],[Math.cos(a)*.2,.02,Math.sin(a)*.2],[Math.cos(a)*.165,.21,Math.sin(a)*.165]],.012,m.brass,6);}
 const point=new T.PointLight(0xffb369,11,5,2);point.position.set(0,-.08,0);g.add(point);
 return g;
}
function roof(parent,m){
 const n=8,rings=[[4.75,3.55,5.3],[4.35,3.15,5.43],[2.6,1.98,6.43],[.28,.21,7.03]],positions=[],indices=[];
 for(const [rx,rz,y]of rings)for(let i=0;i<n;i++){const a=i/n*Math.PI*2+Math.PI/8;positions.push(Math.cos(a)*rx,y,Math.sin(a)*rz);}
 for(let k=0;k<rings.length-1;k++)for(let i=0;i<n;i++){const a=k*n+i,b=k*n+(i+1)%n,c=(k+1)*n+i,d=(k+1)*n+(i+1)%n;indices.push(a,c,b,b,c,d);}
 const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(positions,3));geom.setIndex(indices);geom.computeVertexNormals();
 const mat=m.verdigris.clone();mat.side=T.DoubleSide;mesh(geom,mat,parent);
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2+Math.PI/8;tube(parent,rings.map(([rx,rz,y])=>[Math.cos(a)*rx,y+.025,Math.sin(a)*rz]),.022,m.oldBrass,16);}
 for(let ring=0;ring<2;ring++){const [rx,rz,y]=rings[ring];const points=[];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2+Math.PI/8;points.push([Math.cos(a)*rx,y,Math.sin(a)*rz]);}tube(parent,points,.058,m.darkWood,48);}
 // Straight standing seams follow each roof facet without rounding its corners.
 for(let band=1;band<5;band++){
  const t=band/5,rx=T.MathUtils.lerp(4.35,2.6,t),rz=T.MathUtils.lerp(3.15,1.98,t),y=T.MathUtils.lerp(5.43,6.43,t)+.018;
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2+Math.PI/8,b=(i+1)/n*Math.PI*2+Math.PI/8;tube(parent,[[Math.cos(a)*rx,y,Math.sin(a)*rz],[Math.cos(b)*rx,y,Math.sin(b)*rz]],.012,m.oldBrass,1);}
 }
 mesh(new T.ConeGeometry(.19,.45,8),m.brass,parent,[0,7.27,0]);
 const edgeMaterial=m.terracotta;
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8,b=(i+1)/8*Math.PI*2+Math.PI/8;
  for(let j=1;j<10;j++){const f=j/10,x=T.MathUtils.lerp(Math.cos(a)*4.72,Math.cos(b)*4.72,f),z=T.MathUtils.lerp(Math.sin(a)*3.53,Math.sin(b)*3.53,f);mesh(new T.SphereGeometry(.058,6,4),edgeMaterial,parent,[x,5.25,z]);}
 }
}
function palmLeafGeometry(){const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.33,.3,-.43,.72,0,1.3);shape.bezierCurveTo(.36,.82,.24,.22,0,0);const g=new T.ShapeGeometry(shape,5),p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setZ(i,Math.sin(y*1.8)*.14+Math.abs(p.getX(i))*.23);}g.computeVertexNormals();return g;}
function planter(parent,m,x){
 const root=new T.Group();root.name='courtyard-planter';root.position.set(x,0,1);parent.add(root);
 const profile=[[.29,0],[.34,.035],[.57,.6],[.57,.65],[.51,.65],[.49,.57],[.29,.08]].map(([r,y])=>new T.Vector2(r,y));
 mesh(new T.LatheGeometry(profile,24),m.terracotta,root).name='open-planter';
 mesh(new T.CylinderGeometry(.485,.485,.025,24),m.darkWood,root,[0,.54,0]).name='planter-soil';
 mesh(new T.TorusGeometry(.54,.035,8,24),m.oldBrass,root,[0,.625,0],[Math.PI/2,0,0]);
 const geometry=palmLeafGeometry();
 for(let i=0;i<11;i++){
  const angle=i*Math.PI*2/11,leaf=mesh(geometry,m.leaf,root,[Math.cos(angle)*.12,.55,Math.sin(angle)*.12],[.35+(i%3)*.19,angle,0]);
  leaf.scale.set(.55,.65+(i%4)*.12,.75);
 }
}
function plantWorld(parent,m,quality){
 const r=seeded(777),count=1550,geom=palmLeafGeometry(),material=m.leaf.clone(),time={value:0};
 const inject=shader=>{shader.uniforms.uWindTime=time;shader.vertexShader='uniform float uWindTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat seed = instanceMatrix[3].x * .31 + instanceMatrix[3].z * .18;\ntransformed.x += sin(uWindTime * .65 + seed + position.y * 2.0) * position.y * .065;\ntransformed.z += cos(uWindTime * .43 + seed) * position.y * .04;');};
 material.onBeforeCompile=inject;material.customProgramCacheKey=()=> 'raincourt-leaf-v1';
 const leaves=new T.InstancedMesh(geom,material,count);leaves.castShadow=true;leaves.receiveShadow=true;leaves.frustumCulled=false;
 const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});depth.onBeforeCompile=inject;depth.customProgramCacheKey=()=> 'raincourt-leaf-depth-v1';leaves.customDepthMaterial=depth;
 const dummy=new T.Object3D(),color=new T.Color(),clusters=[];
 const tree=new T.Group();tree.position.set(-.8,0,-8);parent.add(tree);
 const trunkMat=m.darkWood.clone();trunkMat.color.setHex(0x5b5940);
 tube(tree,[[0,0,0],[.6,2.3,.2],[.4,4.4,0],[1.2,6.2,-.1],[.9,8,-.7]],.44,trunkMat,28);
 for(let k=0;k<8;k++){const a=k/8*Math.PI*2;tube(tree,[[0,.55,0],[Math.cos(a)*.8,.14,Math.sin(a)*.9],[Math.cos(a)*1.65,.02,Math.sin(a)*1.7]],.14,trunkMat,12);}
 for(let k=0;k<13;k++){const a=k/13*Math.PI*2,length=3+r()*4,ey=6.2+r()*3.3,ex=Math.cos(a)*length,ez=Math.sin(a)*length*.6;
  tube(tree,[[.6,3.8,0],[.8+ex*.33,5.2,ez*.3],[ex*.7,ey-.45,ez*.7],[ex,ey,ez]],.085+r()*.075,trunkMat,20);clusters.push([ex-.8,ey,ez-8]);
  for(let j=0;j<3;j++){const angle=a+(r()-.5),bx=ex+(r()-.5)*2,bz=ez+(r()-.5)*2;tube(tree,[[ex*.7,ey-.45,ez*.7],[bx,ey+.5,bz],[bx+Math.cos(angle),ey+.9,bz+Math.sin(angle)]],.036,trunkMat,10);clusters.push([bx-.8,ey+.5,bz-8]);}
 }
 for(let i=0;i<count;i++){
  if(i%5!==0){const c=clusters[i%clusters.length];dummy.position.set(c[0]+(r()-.5)*2.9,c[1]+(r()-.5)*1.25,c[2]+(r()-.5)*2.6);dummy.rotation.set(-Math.PI/2+(r()-.5)*1.1,r()*Math.PI*2,r()*Math.PI*2);const s=.4+r()*.75;dummy.scale.set(s,s,.8);}
  else {const k=i%30,a=k/30*Math.PI*2,rad=5.7+(i%3)*.85;dummy.position.set(Math.cos(a)*rad,.04,Math.sin(a)*rad-1.5);dummy.rotation.set((r()-.5)*1.7,r()*Math.PI*2,(r()-.5)*2.7);const s=.65+r()*1.15;dummy.scale.set(s*.58,s,s);}
  dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);color.setHSL(.22+r()*.06,.2+r()*.2,.2+r()*.13);leaves.setColorAt(i,color);
 }
 leaves.count=quality==='low'?650:1550;parent.add(leaves);return{leaves,time,depth};
}
export function buildCourtyard(m,quality='balanced'){
 const root=new T.Group();root.name='raincourt';
 mesh(new T.CylinderGeometry(5.1,5.35,.34,10),m.stone,root,[0,-.03,0]);mesh(new T.CylinderGeometry(4.83,5.08,.14,10),m.paleStone,root,[0,.16,0]);
 mesh(new T.CylinderGeometry(4.74,4.74,.035,10),m.stone,root,[0,.255,0]);
 for(let k=0;k<5;k++){const z=5.2+k*1.1;rounded(root,2.7,.12,.82,.12,k%2?m.paleStone:m.stone,[0,-.015,z]);}
 const pergola=new T.Group();pergola.position.y=.28;root.add(pergola);
 for(const x of [-3.15,3.15])for(const z of [-2.2,2.2]){
  mesh(new T.CylinderGeometry(.28,.38,.34,8),m.paleStone,pergola,[x,.17,z]);mesh(new T.CylinderGeometry(.19,.24,4.6,8),m.darkWood,pergola,[x,2.65,z]);
  for(const y of [.4,1.6,4.45,4.95])mesh(new T.CylinderGeometry(y===4.95?.35:.26,y===4.95?.31:.26,.1,8),m.oldBrass,pergola,[x,y,z]);
  for(let j=0;j<4;j++){const ring=mesh(new T.TorusGeometry(.23,.017,6,8),m.brass,pergola,[x,4.55+j*.065,z],[Math.PI/2,0,0]);}
  lantern(pergola,m,x*.78,4.02,z*.78);
 }
 for(const z of [-2.2,2.2])rounded(pergola,6.75,.25,.28,.04,m.darkWood,[0,5,z]);
 for(const x of [-3.15,3.15])rounded(pergola,.28,.25,4.7,.04,m.darkWood,[x,5,0]);
 for(const x of [-3.15,3.15])for(const z of [-2.2,2.2]){
  tube(pergola,[[x,4.25,z],[x-Math.sign(x)*.45,4.52,z],[x-Math.sign(x)*.82,5,z]],.07,m.darkWood,12);
  tube(pergola,[[x,4.25,z],[x,4.52,z-Math.sign(z)*.45],[x,5,z-Math.sign(z)*.82]],.07,m.darkWood,12);
 }
 for(const x of [-3.15,0,3.15])rounded(pergola,.16,.25,5.8,.025,m.darkWood,[x,5.23,0]);
 roof(pergola,m);
 for(const x of [-11,-7,7,11]){
  box(root,3.7,.9,.65,m.terracotta,[x,.35,-11]);box(root,3.8,.08,.72,m.oldBrass,[x,.84,-11]);
  for(const xx of [-1.5,1.5])box(root,.22,3.7,.35,m.stone,[x+xx,2.45,-11]);
  box(root,3.6,.18,.46,m.paleStone,[x,4.32,-11]);
  for(let j=0;j<5;j++)box(root,.075,.7,.12,m.darkWood,[x-1.2+j*.6,1.3,-11]);
 }
 for(const x of [-5.3,5.3])planter(root,m,x);
 const vegetation=plantWorld(root,m,quality);
 return{root,vegetation};
}
