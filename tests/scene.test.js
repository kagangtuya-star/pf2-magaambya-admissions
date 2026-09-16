import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
const installed=existsSync(new URL('../web/vendor/three.module.js',import.meta.url));
test('Actual Three.js model geometry and articulation',{skip:!installed?'Install Three.js before running geometry tests. This is not a GPU render test.':false},async()=>{
 const T=await import('../web/vendor/three.module.js');const{buildChest,buildEnvelope,buildDesk}=await import('../web/scene/models.js');const{buildCourtyard}=await import('../web/scene/courtyard.js');
 const {batchStatic}=await import('../web/scene/batch.js');assert.equal(T.REVISION,'180');const m={};for(const key of ['wood','darkWood','stone','paleStone','terracotta','verdigris','brass','oldBrass','paper','letter','lining','wax','leaf','light'])m[key]=new T.MeshStandardMaterial({side:T.DoubleSide});
 const chest=buildChest(m),letter=buildEnvelope(m),desk=buildDesk(m),court=buildCourtyard(m,'low');chest.setOpen(1);assert.equal(chest.lid.rotation.x,-1.69);letter.setOpen(1);assert.equal(letter.seal.visible,false);assert.ok(letter.flap.rotation.x<-3);assert.equal(court.vegetation.leaves.count,650);
 const boundsBefore=new T.Box3().setFromObject(court.root);const batched=batchStatic(court.root);const boundsAfter=new T.Box3().setFromObject(court.root);assert.ok(batched.sourceMeshes>batched.batches);assert.ok(boundsBefore.min.distanceTo(boundsAfter.min)<.01);assert.ok(boundsBefore.max.distanceTo(boundsAfter.max)<.01);
 for(const root of[chest.root,letter.root,desk,court.root])root.traverse(o=>{if(o.geometry){const p=o.geometry.attributes.position.array;assert.ok(p.every(Number.isFinite));assert.ok(p.length>0);}});
});
