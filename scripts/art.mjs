import {writeFileSync} from 'node:fs';
let seed=19655;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const polygon=(pts,fill,stroke='',sw=1)=>`<polygon points="${pts}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}"`:''}/>`;
const line=(x1,y1,x2,y2,color,w=1,opacity=1)=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="${w}" opacity="${opacity}" fill="none"/>`;
let out=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><defs><linearGradient id="sky" x2=".2" y2="1"><stop stop-color="#8b9e77"/><stop offset=".55" stop-color="#677f60"/><stop offset="1" stop-color="#254e3c"/></linearGradient><linearGradient id="water" x2="0" y2="1"><stop stop-color="#657b56"/><stop offset="1" stop-color="#183e32"/></linearGradient><linearGradient id="wood"><stop stop-color="#755c37"/><stop offset=".45" stop-color="#a38551"/><stop offset="1" stop-color="#5c4a30"/></linearGradient><linearGradient id="roof" x2=".25" y2="1"><stop stop-color="#6d7750"/><stop offset=".4" stop-color="#4f6549"/><stop offset="1" stop-color="#253e2d"/></linearGradient><linearGradient id="stone" x2="0" y2="1"><stop stop-color="#9a9c70"/><stop offset="1" stop-color="#546b4b"/></linearGradient><radialGradient id="sun"><stop stop-color="#d4d8a9" stop-opacity=".36"/><stop offset="1" stop-color="#cfdda7" stop-opacity="0"/></radialGradient><radialGradient id="light"><stop stop-color="#edce75" stop-opacity=".55"/><stop offset="1" stop-color="#d4b363" stop-opacity="0"/></radialGradient><filter id="soft"><feGaussianBlur stdDeviation="2"/></filter><filter id="paper"><feTurbulence baseFrequency=".52" numOctaves="3" seed="18" type="fractalNoise"/><feColorMatrix type="saturate" values="0"/></filter><g id="leaf"><path d="M0 0Q-24-25-1-53Q23-29 0 0" fill="currentColor"/><path d="M0 0L-1-50" stroke="#b4ba87" stroke-opacity=".23" stroke-width=".65"/></g></defs><path d="M0 0h1600v1000H0z" fill="url(#sky)"/><ellipse cx="1110" cy="250" rx="450" ry="370" fill="url(#sun)"/>`;
for(let i=0;i<26;i++){const x=i*73-30,h=130+random()*160,y=440-random()*65;out+=`<path d="M${x} ${y}v-${h}l40-${20+random()*20} 46 31v${h}z" fill="#657e59" opacity=".5"/>`;}
for(let i=0;i<15;i++){const x=85+i*118,y=510-random()*75;out+=`<path d="M${x} ${y}q15-160 -12-300" fill="none" stroke="#436346" stroke-width="${6+random()*13}" opacity=".75"/>`;for(let j=0;j<14;j++){out+=`<ellipse cx="${x-78+random()*150}" cy="${y-300+random()*110}" rx="${25+random()*37}" ry="${21+random()*29}" fill="${['#486d49','#527952','#5f8055'][j%3]}" opacity=".5"/>`;}}
out+=`<path d="M0 565Q700 455 1600 533V1000H0z" fill="url(#water)"/>`;
for(let i=0;i<250;i++){let y=554+random()*455,x=random()*1600;out+=line(x,y,x+8+random()*130,y-1,'#9da982',.5+random(),.04+random()*.12);}
out+=`<g opacity=".12" transform="translate(0 1490) scale(1 -1)"><path d="M677 585L855 187h261l254 375-272 167z" fill="#c3b680"/><path d="M760 360V722M1295 356V698M959 472V829" stroke="#172e20" stroke-width="42"/></g>`;
out+=`<g opacity=".24"><path d="M1270 0L470 795l90 26L1420 0" fill="#cddbb0"/><path d="M1390 0L735 816l58 24L1490 0" fill="#d3ddb0"/></g>`;
// The pavilion is a deliberately flat, print-like fallback, not a captured 3D render.
out+=polygon('596,680 987,836 1495,648 1100,515','#344f38');
out+=polygon('596,680 987,836 987,871 596,715','#435e42');
out+=polygon('987,836 1495,648 1495,684 987,871','#566c49');
out+=polygon('632,648 988,790 1450,620 1095,496','url(#stone)','#abac7c',1);
out+=polygon('632,648 988,790 988,827 632,684','#4e6344');
out+=polygon('988,790 1450,620 1450,655 988,827','#778360');
for(let i=0;i<5;i++){const x=862-i*23,y=827+i*14;out+=polygon(`${x},${y} ${x+147},${y+56} ${x+274},${y+3} ${x+120},${y-51}`,'#788360','#9ba37a',.75);out+=polygon(`${x},${y} ${x+147},${y+56} ${x+147},${y+66} ${x},${y+10}`,'#4e6546');out+=polygon(`${x+147},${y+56} ${x+274},${y+3} ${x+274},${y+13} ${x+147},${y+66}`,'#5f7753');}
for(let i=0;i<7;i++){out+=line(680+i*65,665+i*26,1136+i*47,513+i*21,'#4b6748',1,.33);}
const column=(x,y,h,w=23)=>{let s=polygon(`${x-w},${y-h} ${x+w},${y-h+8} ${x+w},${y} ${x-w},${y-8}`,'url(#wood)','#6b6643',.5);for(let d of[12,27,h-68,h-54])s+=polygon(`${x-w-3},${y-h+d} ${x+w+3},${y-h+d+8} ${x+w+3},${y-h+d+18} ${x-w-3},${y-h+d+10}`,'#a39258');for(let k=0;k<8;k++)s+=line(x-w+k*6,y-h+50,x-w+k*6,y-81,'#d2c183',.7,.13);s+=polygon(`${x-w-10},${y-24} ${x+25},${y-15} ${x+34},${y+3} ${x-36},${y-7}`,'#829069');return s;};
out+=column(1093,554,295,17)+column(784,674,317,22)+column(1315,628,309,22);
out+=`<path d="M789 367L882 375 791 480zM1309 331l-76 68 74 39z" fill="#766c45" stroke="#b09b61" stroke-width="2"/>`;
out+=polygon('689,334 905,203 1213,225 1403,341 991,503','url(#roof)','#ad9f63',2);
out+=polygon('689,334 991,470 991,503 689,365','#4b5134','#928253',1);
out+=polygon('991,470 1403,311 1403,342 991,503','#3d5035','#a29a63',1);
out+=polygon('689,334 991,470 1062,144','url(#roof)','#a5a16c',1.5);
out+=polygon('991,470 1403,311 1062,144','#425f43','#a6a46f',1.5);
out+=`<ellipse cx="1062" cy="142" rx="9" ry="5" fill="#bfa771"/>`;
for(let i=0;i<16;i++){const t=i/16;out+=line(689+t*302,334+t*136,1062,144,'#98a476',.75,.2);out+=line(991+t*412,470-t*159,1062,144,'#93a173',.75,.2);}
out+=column(985,756,280,25);
out+=polygon('775,440 780,428 976,499 976,516','#c7ad6f','#605e3b',1);out+=`<path d="M793 440Q826 441 846 488L845 510 808 465zM966 503L919 511 957 560z" fill="#806e45" stroke="#b7a46b"/>`;
for(let p of[[839,424],[1262,376]]){let[x,y]=p;out+=`<path d="M${x} ${y}v80" stroke="#8f8e54" stroke-width="1"/><circle cx="${x}" cy="${y+98}" r="62" fill="url(#light)"/><path d="M${x-10} ${y+80}q10-14 20 0l3 36q-13 8-26 0z" fill="#c3a763" stroke="#786b37"/><path d="M${x-9} ${y+83}v30h18v-30z" fill="#e1c774" opacity=".9"/>`;}
out+=polygon('1005,637 1115,682 1225,640 1115,600','#55573b','#bba772',1);
out+=polygon('1013,646 1031,652 1031,699 1013,692','#514c33');out+=polygon('1200,651 1217,644 1217,692 1200,699','#504d30');
out+=polygon('1053,610 1119,634 1180,612 1113,588','#a0834c','#dcc18a',.9);out+=polygon('1053,610 1119,634 1119,671 1053,646','#6c4f2f','#b59a60',.7);out+=polygon('1119,634 1180,612 1180,649 1119,671','#80623a','#ae9b61',.8);out+=`<path d="M1105 629v25l8 3v-25" fill="#c3a260"/><circle cx="1090" cy="641" r="6" fill="#b29b5b"/>`;
for(let i=0;i<500;i++){const side=i%3,x=side===0?random()*400:side===1?1340+random()*330:random()*1600,y=side===2?random()*125:320+random()*700,scale=.55+random()*1.5;out+=`<use href="#leaf" transform="translate(${x} ${y}) rotate(${random()*360}) scale(${scale})" color="${['#2c553c','#396345','#203e2c','#416d47','#526f42'][i%5]}" opacity="${.35+random()*.5}"/>`;}
for(let i=0;i<65;i++){const x=1340+random()*350,y=580+random()*380;out+=`<path d="M${x} ${y+55}q-90-80-120-93Q${x-24} ${y-5} ${x} ${y+55}" fill="#203e2a" opacity=".8"/>`;}
out+=`<path d="M0 0h1600v1000H0z" filter="url(#paper)" opacity=".035"/></svg>`;
writeFileSync(new URL('../web/assets/raincourt-poster.svg',import.meta.url),out);
let botanical=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 310"><g fill="none" stroke="#6f8156" stroke-linecap="round"><path d="M127 284Q149 208 125 151T151 29M135 236Q104 176 58 151M132 189Q190 164 215 106M130 153Q81 107 67 49M128 100Q173 80 190 45" stroke-width="1.4"/>`;
const pairs=[[137,227,35],[127,191,-54],[120,157,32],[128,114,-29],[134,72,30],[142,39,10],[96,188,-65],[71,166,-61],[167,169,53],[198,133,33],[95,115,-52],[79,83,-31],[154,82,45],[177,57,35]];
for(let[x,y,r]of pairs){botanical+=`<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0Q-29-29-3-69Q21-36 0 0" fill="#82915b" fill-opacity=".07" stroke-width=".9"/><path d="M0 0L-3-64" stroke-width=".7"/>`;for(let j=1;j<6;j++){let yy=-j*10;botanical+=`<path d="M${yy*.046} ${yy}l-12-11m12 11 11-12" stroke-width=".45"/>`;}botanical+='</g>';}
botanical+=`<path d="M101 291h60m-41 7h35" stroke-width=".6" opacity=".6"/><circle cx="229" cy="239" r="18" stroke-width=".6" opacity=".6"/><path d="M229 227v24m-8-12h16" stroke-width=".6" opacity=".6"/></g></svg>`;
writeFileSync(new URL('../web/assets/botanical.svg',import.meta.url),botanical);
console.log('Original SVG assets created.');
