import {cp,mkdir,rm,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {vendor} from './vendor.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);await vendor();await rm('dist',{recursive:true,force:true});await mkdir('dist');await cp('web','dist',{recursive:true});
const assets=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else{const data=await readFile(p);assets.push({path:p.replaceAll('\\','/').replace(/^dist\//,''),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}await walk('dist');await writeFile('dist/build-manifest.json',JSON.stringify({version:'2.0.0',three:'0.180.0',assets},null,2));console.log(`Built ${assets.length} same-origin assets. Set SERVE_DIST=1 to serve dist.`);
