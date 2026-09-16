import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
const installed=existsSync(new URL('../web/vendor/three.module.js',import.meta.url));
test('Actual Three.js model geometry and articulation',{skip:!installed?'Install Three.js before running geometry tests. This is not a GPU render test.':false},async()=>{
 const T=await import('../web/vendor/three.module.js');const{buildChest,buildEnvelope,buildDesk}=await import('../web/scene/models.js');const{buildCourtyard}=await import('../web/scene/courtyard.js');
 const {batchStatic}=await import('../web/scene/batch.js');assert.equal(T.REVISION,'180');const m={};for(const key of ['wood','darkWood','stone','paleStone','terracotta','verdigris','brass','oldBrass','paper','letter','lining','wax','leaf','light'])m[key]=new T.MeshStandardMaterial({side:T.DoubleSide});
 const chest=buildChest(m),letter=buildEnvelope(m),desk=buildDesk(m),court=buildCourtyard(m,'low');chest.setOpen(1);assert.equal(chest.lid.rotation.x,-1.69);letter.setOpen(1);assert.equal(letter.seal.visible,false);assert.ok(letter.flap.rotation.x<-3);assert.equal(court.vegetation.leaves.count,650);
 const boundsBefore=new T.Box3().setFromObject(court.root);const batched=batchStatic(court.root);const boundsAfter=new T.Box3().setFromObject(court.root);assert.ok(batched.sourceMeshes>batched.batches);assert.ok(boundsBefore.min.distanceTo(boundsAfter.min)<.01);assert.ok(boundsBefore.max.distanceTo(boundsAfter.max)<.01);
 for(const root of[chest.root,letter.root,desk,court.root])root.traverse(o=>{if(o.geometry){const p=o.geometry.attributes.position.array;assert.ok(p.every(Number.isFinite));assert.ok(p.length>0);}});
});
test('Envelope seams face outward and the sealed letter clears the chest during lifting',{skip:!installed},async()=>{
 const T=await import('../web/vendor/three.module.js');const {buildEnvelope}=await import('../web/scene/models.js');const {RaincourtScene}=await import('../web/scene/scene.js');
 const material=new T.MeshStandardMaterial({side:T.DoubleSide}),envelope=buildEnvelope({paper:material,letter:material,wax:material});envelope.root.scale.setScalar(.9);
 const seams=envelope.flap.children.filter(o=>o.name==='flap-fold');assert.equal(seams.length,2);
 for(const seam of seams){seam.geometry.computeBoundingBox();assert.ok(seam.geometry.boundingBox.min.z>.015,'Fold must sit above the flap surface');}
 const scene={camera:new T.PerspectiveCamera(),look:new T.Vector3(),values:{},chest:{setOpen(){}},envelope},point=new T.Vector3();
 for(let i=0;i<=100;i++){
  RaincourtScene.prototype.applyPose.call(scene,{eye:new T.Vector3(4,4,7),look:new T.Vector3(),open:1,lift:i/100,unfold:0});envelope.root.updateMatrixWorld(true);
  envelope.root.traverse(o=>{if(!o.isMesh)return;const vertices=o.geometry.attributes.position;for(let j=0;j<vertices.count;j++){point.fromBufferAttribute(vertices,j).applyMatrix4(o.matrixWorld);if(point.y<2.87)assert.ok(Math.abs(point.z)<.735&&Math.abs(point.x)<1.385,`Envelope intersects chest wall at lift ${i/100}`);}});
 }
});
test('Furniture contacts its supporting surface and planter mouths remain open',{skip:!installed},async()=>{
 const T=await import('../web/vendor/three.module.js');const {buildChest,buildDesk}=await import('../web/scene/models.js');const {buildCourtyard}=await import('../web/scene/courtyard.js');
 const material=new T.MeshStandardMaterial({side:T.DoubleSide}),m=Object.fromEntries(['wood','darkWood','stone','paleStone','terracotta','verdigris','brass','oldBrass','lining','leaf','light'].map(key=>[key,material]));
 const desk=buildDesk(m),chest=buildChest(m),court=buildCourtyard(m,'low');desk.position.y=.3;chest.root.position.y=1.77;desk.updateMatrixWorld(true);chest.root.updateMatrixWorld(true);
 const bounds=object=>new T.Box3().setFromObject(object),feet=[];desk.traverse(o=>{if(o.name==='desk-foot')feet.push(o);});
 assert.equal(feet.length,4);for(const foot of feet)assert.ok(Math.abs(bounds(foot).min.y-.2725)<.002,'Desk feet must touch the platform');
 const tabletop=desk.children.find(o=>o.material===m.lining&&o.geometry?.type==='BoxGeometry'&&o.position.y===1.408);const surface=bounds(tabletop).max.y;
 chest.root.traverse(o=>{if(o.name==='casket-foot')assert.ok(Math.abs(bounds(o).min.y-surface)<.01,'Casket feet must rest on the desk');});
 court.root.updateMatrixWorld(true);const pots=court.root.children.filter(o=>o.name==='courtyard-planter');assert.equal(pots.length,2);
 for(const pot of pots){
  const ray=new T.Raycaster(new T.Vector3(pot.position.x,2,pot.position.z),new T.Vector3(0,-1,0));
  assert.equal(ray.intersectObject(pot.getObjectByName('open-planter')).length,0,'The pot must not have a solid lid');
  const hits=ray.intersectObject(pot.getObjectByName('planter-soil'));assert.ok(hits.length>0);assert.ok(hits[0].point.y<.6,'Soil must sit below the rim');
 }
});
