import * as T from '../vendor/three.module.js';
import {seeded} from '../lib/state.js';
export function mesh(geo,material,parent,position=[0,0,0],rotation=[0,0,0]){const m=new T.Mesh(geo,material);m.position.set(...position);m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function box(parent,w,h,d,material,p=[0,0,0]){return mesh(new T.BoxGeometry(w,h,d),material,parent,p);}
export function rounded(parent,w,h,d,r,material,p=[0,0,0]){r=Math.min(r,w*.45,h*.45,d*.45);const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const g=new T.ExtrudeGeometry(s,{depth:Math.max(.004,d-r*.4),bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r*.2,bevelThickness:r*.2,curveSegments:5});g.center();return mesh(g,material,parent,p);}
export function tube(parent,points,radius,material,segments=20){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,radius,6,false),material,parent);}
function panel(parent,points,material,depth=.015){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:6}),material,parent);}
export function crest(parent,material,size=.22,plane='front',accents={}){
 const group=new T.Group();group.name='magaambya-crest';parent.add(group);group.scale.setScalar(size);
 const foliage=accents.leaf||material,edge=accents.edge||material;
 const leaf=new T.Shape();leaf.moveTo(0,0);leaf.bezierCurveTo(-.17,.08,-.18,.29,0,.42);leaf.bezierCurveTo(.18,.29,.17,.08,0,0);
 const leafGeo=new T.ExtrudeGeometry(leaf,{depth:.035,bevelEnabled:true,bevelThickness:.009,bevelSize:.009,bevelSegments:1,curveSegments:6});
 for(let i=0;i<10;i++){
  const angle=i*Math.PI/5+Math.PI/10,branch=new T.Group();branch.rotation.z=angle;group.add(branch);
  tube(branch,[[0,.43,.025],[0,.67,.045],[0,.94,.05]],.012,edge,8);
  mesh(leafGeo,foliage,branch,[0,.59,.018]);
  tube(branch,[[0,.63,.064],[0,.79,.075],[0,.96,.06]],.008,edge,8);
  for(const y of [.73,.82])for(const side of [-1,1])tube(branch,[[0,y,.068],[side*.075,y+.045,.06]],.005,edge,3);
 }
 const starPoints=scale=>Array.from({length:20},(_,i)=>{const a=Math.PI/2+i*Math.PI/10,r=(i%2?.35:.84)*scale;return [Math.cos(a)*r,Math.sin(a)*r];});
 const rim=panel(group,starPoints(1),edge,.035);rim.position.z=.045;
 const inset=panel(group,starPoints(.91),material,.025);inset.position.z=.083;
 const innerRim=panel(group,starPoints(.68),edge,.018);innerRim.position.z=.111;
 const points=starPoints(.59),vertices=[];
 for(let i=0;i<20;i++){
  const a=points[i],b=points[(i+1)%20];vertices.push(0,0,.2,a[0],a[1],i%2?.135:.16,b[0],b[1],i%2?.16:.135);
 }
 const facets=new T.BufferGeometry();facets.setAttribute('position',new T.Float32BufferAttribute(vertices,3));facets.computeVertexNormals();mesh(facets,material,group);
 if(plane==='top')group.rotation.x=-Math.PI/2;return group;
}
export function buildChest(m){
 const root=new T.Group();root.name='admissions-casket';const w=3.05,d=1.75,top=1.08;
 rounded(root,w,.17,d,.07,m.darkWood,[0,.1,0]);rounded(root,w,.9,.14,.035,m.wood,[0,.62,d/2-.07]);rounded(root,w,.9,.14,.035,m.wood,[0,.62,-d/2+.07]);rounded(root,.14,.9,d-.25,.025,m.wood,[-w/2+.07,.62,0]);rounded(root,.14,.9,d-.25,.025,m.wood,[w/2-.07,.62,0]);box(root,w-.28,.028,d-.28,m.lining,[0,.2,0]);
 for(const y of [.23,1.02]){for(const z of [-d/2,d/2])box(root,w+.015,.038,.055,m.oldBrass,[0,y,z]);for(const x of [-w/2,w/2])box(root,.055,.038,d,m.oldBrass,[x,y,0]);}for(const z of [-d/2+.09,d/2-.09])box(root,w-.14,.05,.06,m.darkWood,[0,1.055,z]);for(const x of [-w/2+.09,w/2-.09])box(root,.06,.05,d-.18,m.darkWood,[x,1.055,0]);
 for(const x of [-1.29,1.29]){box(root,.14,.89,.015,m.brass,[x,.62,d/2+.013]);box(root,.14,.89,.015,m.brass,[x,.62,-d/2-.013]);for(const y of [.29,.52,.79,.97]){const rivet=mesh(new T.SphereGeometry(.029,8,6),m.oldBrass,root,[x,y,d/2+.03]);rivet.scale.z=.5;}}
 rounded(root,1.7,.52,.026,.07,m.darkWood,[0,.64,d/2+.02]);for(let i=0;i<9;i++){const x=-.71+i*.178;tube(root,[[x-.06,.43,.903],[x+.06,.55,.91],[x-.06,.67,.903],[x+.06,.79,.91]],.009,m.oldBrass,9);}
 const crestAccents={leaf:m.oldBrass,edge:m.brass};const mark=crest(root,m.verdigris,.245,'front',crestAccents);mark.position.set(0,.645,.955);
 for(const x of [-1.32,1.32])for(const z of [-.67,.67])rounded(root,.29,.1,.28,.04,m.darkWood,[x,-.005,z]).name='casket-foot';
 for(const side of [-1,1]){
  const handle=new T.Group();handle.name='casket-side-handle';handle.position.set(side*(w/2+.025),.64,0);handle.rotation.y=side*Math.PI/2;root.add(handle);
  for(const x of [-.27,.27]){rounded(handle,.13,.19,.025,.025,m.oldBrass,[x,0,0]);mesh(new T.SphereGeometry(.025,8,6),m.brass,handle,[x,.045,.023]);}
  tube(handle,[[-.27,0,.04],[-.25,-.15,.13],[0,-.21,.16],[.25,-.15,.13],[.27,0,.04]],.025,m.oldBrass,16);
 }
 const lidPivot=new T.Group();lidPivot.name='rear-hinge';lidPivot.position.set(0,top,-d/2);root.add(lidPivot);const lid=new T.Group();lid.position.z=d/2;lidPivot.add(lid);
 rounded(lid,w+.08,.18,d+.07,.05,m.wood,[0,.08,0]);rounded(lid,w-.14,.12,d-.13,.1,m.wood,[0,.19,0]);rounded(lid,w-.4,.06,d-.37,.07,m.darkWood,[0,.27,0]);const topMark=crest(lid,m.verdigris,.48,'top',crestAccents);topMark.position.set(0,.305,0);
 for(const x of [-1.29,1.29]){box(lid,.145,.018,d+.08,m.brass,[x,.19,0]);for(const z of [-.72,-.42,.42,.72])mesh(new T.SphereGeometry(.027,8,6),m.brass,lid,[x,.207,z]);mesh(new T.CylinderGeometry(.074,.074,.24,12),m.brass,root,[x,top,-d/2],[0,0,Math.PI/2]);}
 rounded(lid,.22,.25,.045,.03,m.brass,[0,-.033,d/2+.049]);mesh(new T.TorusGeometry(.055,.012,6,16),m.darkWood,lid,[0,-.07,d/2+.079]);const innerSeal=crest(lid,m.verdigris,.25,'front',crestAccents);innerSeal.rotation.x=Math.PI/2;innerSeal.position.set(0,-.018,0);
 return {root,lid:lidPivot,setOpen(t){lidPivot.rotation.x=-t*1.69;}};
}
export function buildEnvelope(m){
 const root=new T.Group();root.name='folded-admissions-letter';const w=2.52,h=1.6;panel(root,[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],m.paper).name='paper-back';
 const letter=new T.Group();root.add(letter);letter.position.z=.025;const letterGeo=new T.PlaneGeometry(w*.9,h*.91,18,24);mesh(letterGeo,m.letter,letter).name='inner-letter';const original=new Float32Array(letterGeo.attributes.position.array);
 const lower=panel(root,[[-w/2,-h/2],[w/2,-h/2],[0,.33]],m.paper);lower.position.z=.061;const left=panel(root,[[-w/2,-h/2],[-w/2,h/2],[.08,-.14]],m.paper);left.position.z=.043;const right=panel(root,[[w/2,-h/2],[-.08,-.14],[w/2,h/2]],m.paper);right.position.z=.045;
 const foldMat=new T.MeshStandardMaterial({color:0x96876b,roughness:.95});
 const lowerFold=tube(root,[[-w/2+.014,-h/2+.014,.079],[0,.33,.079],[w/2-.014,-h/2+.014,.079]],.0025,foldMat,2);lowerFold.name='lower-envelope-fold';lowerFold.castShadow=false;
 const flap=new T.Group();flap.name='crease-hinge';flap.position.set(0,h/2,.075);root.add(flap);panel(flap,[[-w/2,0],[0,-1.05],[w/2,0]],m.paper);
 for(const side of [-1,1]){const seam=tube(flap,[[side*(w/2-.014),-.01,.02],[0,-1.038,.02]],.003,foldMat,1);seam.name='flap-fold';seam.castShadow=false;}
 const seal=new T.Group();seal.name='wax-seal';seal.position.set(0,-.1,.132);root.add(seal);const wax=new T.Shape(),random=seeded(341);for(let i=0;i<=42;i++){const a=i/42*Math.PI*2,r=.21+(random()-.5)*.021;i?wax.lineTo(Math.cos(a)*r,Math.sin(a)*r):wax.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
 mesh(new T.ExtrudeGeometry(wax,{depth:.03,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2,curveSegments:6}),m.wax,seal);mesh(new T.TorusGeometry(.154,.008,6,36),m.wax,seal,[0,0,.042]);const c=crest(seal,m.wax,.135);c.position.z=.051;
 return {root,flap,letter,seal,setOpen(t){const crack=T.MathUtils.smoothstep(t,0,.25);seal.position.z=.132+crack*.27;seal.position.y=-.1-crack*.21;seal.rotation.z=crack*.3;seal.scale.setScalar(1-crack*.14);seal.visible=t<.42;flap.rotation.x=-T.MathUtils.smoothstep(t,.12,.7)*Math.PI*.96;const lift=T.MathUtils.smoothstep(t,.45,1);letter.position.y=lift*.79;letter.position.z=.025+lift*.24;const p=letterGeo.attributes.position;for(let i=0;i<p.count;i++){const x=original[i*3],y=original[i*3+1];p.setZ(i,Math.sin((y/h+.5)*Math.PI)*lift*.085+Math.sin(x/w*Math.PI)*lift*.04);}p.needsUpdate=true;letterGeo.computeVertexNormals();}};
}
export function buildDesk(m){
 const root=new T.Group();root.name='stone-reading-table';
 rounded(root,4.35,.2,2.7,.12,m.paleStone,[0,1.24,0]);rounded(root,4.06,.095,2.43,.08,m.darkWood,[0,1.355,0]);
 for(const x of [-1.58,1.58])for(const z of [-.82,.82]){
  mesh(new T.CylinderGeometry(.12,.23,1.1,8),m.stone,root,[x,.61,z]);
  mesh(new T.CylinderGeometry(.25,.28,.13,8),m.oldBrass,root,[x,.038,z]).name='desk-foot';
  mesh(new T.CylinderGeometry(.24,.15,.12,8),m.paleStone,root,[x,1.09,z]);
 }
 for(const z of [-.82,.82])rounded(root,3.35,.16,.12,.025,m.darkWood,[0,1.08,z]);
 for(const x of [-1.58,1.58])rounded(root,.12,.16,1.64,.025,m.darkWood,[x,1.08,0]);
 box(root,3.65,.012,1.92,m.lining,[0,1.408,0]);
 for(const x of [-1.77,1.77])box(root,.026,.017,1.93,m.oldBrass,[x,1.418,0]);
 for(const z of [-.952,.952])box(root,3.56,.017,.026,m.oldBrass,[0,1.418,z]);
 return root;
}
