import * as T from '../vendor/three.module.js';
import {seeded} from '../lib/state.js';
function canvasTexture(draw,size=512){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;return texture;
}
export function woodTexture(){const r=seeded(382);return canvasTexture((ctx,n)=>{
 ctx.fillStyle='#544131';ctx.fillRect(0,0,n,n);
 for(let i=0;i<1500;i++){const y=r()*n;ctx.strokeStyle=`rgba(${r()>.5?'17,10,4':'156,121,71'},${.025+r()*.13})`;ctx.lineWidth=.3+r()*1.8;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=n;x+=8)ctx.lineTo(x,y+Math.sin(x*.016+y*.08)*2.4+Math.sin(x*.035+y*.1));ctx.stroke();}
 for(let i=0;i<9;i++){const x=r()*n,y=r()*n;for(let j=0;j<5;j++){ctx.strokeStyle='rgba(28,18,10,.07)';ctx.beginPath();ctx.ellipse(x,y,18+j*7,2+j*2,0,0,Math.PI*2);ctx.stroke();}}
});}
export function paperTexture(letter=false){const r=seeded(letter?981:356);return canvasTexture((ctx,n)=>{
 ctx.fillStyle=letter?'#f3ecd9':'#dfd5b9';ctx.fillRect(0,0,n,n);const image=ctx.getImageData(0,0,n,n);
 for(let i=0;i<image.data.length;i+=4){const v=(r()-.5)*12;image.data[i]+=v;image.data[i+1]+=v;image.data[i+2]+=v;}ctx.putImageData(image,0,0);
 for(let i=0;i<2000;i++){const x=r()*n,y=r()*n;ctx.strokeStyle='rgba(92,67,34,.045)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3+r()*8,y+(r()-.5)*2);ctx.stroke();}
 if(letter){ctx.strokeStyle='#819384';ctx.lineWidth=1;ctx.strokeRect(34,32,n-68,n-64);ctx.strokeStyle='#b5a580';ctx.strokeRect(40,38,n-80,n-76);ctx.fillStyle='#3c5649';ctx.font='24px Georgia, serif';ctx.textAlign='center';ctx.fillText('MAGAAMBYA',n/2,119);ctx.font='11px Georgia, serif';ctx.fillText('N A N T A M B U',n/2,141);ctx.strokeStyle='#a5a490';for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(76,190+i*17);ctx.lineTo(i===11?n*.54:n-77,190+i*17);ctx.stroke();}ctx.font='italic 16px Georgia, serif';ctx.fillText('The beginning of your story',n/2,437);}
});}
export function stoneTexture(){const r=seeded(116);return canvasTexture((ctx,n)=>{ctx.fillStyle='#788c80';ctx.fillRect(0,0,n,n);for(let i=0;i<10000;i++){ctx.fillStyle=`rgba(${r()>.5?'224,219,192':'29,52,42'},${r()*.09})`;ctx.beginPath();ctx.ellipse(r()*n,r()*n,.6+r()*7,.5+r()*2,r()*3,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='rgba(40,61,43,.17)';ctx.lineWidth=2;ctx.strokeRect(1,1,n-2,n-2);});}
export function leafTexture(){return canvasTexture((ctx,n)=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,n,n);ctx.strokeStyle='#7d9c7e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(n/2,n);ctx.lineTo(n/2,0);ctx.stroke();ctx.lineWidth=1;for(let i=1;i<18;i++){const y=i*n/18;ctx.beginPath();ctx.moveTo(n/2,y);ctx.lineTo(10,y-n*.11);ctx.moveTo(n/2,y);ctx.lineTo(n-10,y-n*.11);ctx.stroke();}},128);}
export function makeMaterials(){const wood=woodTexture(),paper=paperTexture(),letter=paperTexture(true),stone=stoneTexture(),leaf=leafTexture();return{
 wood:new T.MeshStandardMaterial({color:0x847156,map:wood,roughness:.68,metalness:.02}),darkWood:new T.MeshStandardMaterial({color:0x423c2a,map:wood,roughness:.73}),stone:new T.MeshStandardMaterial({color:0x788a70,map:stone,roughness:.86}),paleStone:new T.MeshStandardMaterial({color:0xa9a086,map:stone,roughness:.8}),terracotta:new T.MeshStandardMaterial({color:0x77543d,roughness:.88}),verdigris:new T.MeshStandardMaterial({color:0x517166,roughness:.62,metalness:.24}),brass:new T.MeshStandardMaterial({color:0xbda371,metalness:.76,roughness:.3}),oldBrass:new T.MeshStandardMaterial({color:0x8b7847,metalness:.58,roughness:.48}),paper:new T.MeshStandardMaterial({map:paper,side:T.DoubleSide,roughness:.94}),letter:new T.MeshStandardMaterial({map:letter,side:T.DoubleSide,roughness:.93}),lining:new T.MeshStandardMaterial({color:0x263f31,roughness:1}),wax:new T.MeshPhysicalMaterial({color:0x973d29,roughness:.55,clearcoat:.16,clearcoatRoughness:.6}),leaf:new T.MeshStandardMaterial({color:0x657b49,map:leaf,roughness:.78,side:T.DoubleSide}),light:new T.MeshBasicMaterial({color:new T.Color(2.9,1.48,.48),toneMapped:false}),textures:[wood,paper,letter,stone,leaf]};}
