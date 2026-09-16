import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
export async function vendor(){
 const pkg=JSON.parse(await readFile(path.join(root,'node_modules/three/package.json'),'utf8'));
 if(pkg.version!=='0.180.0')throw new Error(`Expected Three.js 0.180.0, found ${pkg.version}. Run npm install.`);
 const dest=path.join(root,'web/vendor');await mkdir(dest,{recursive:true});
 for(const [from,to] of [['build/three.module.min.js','three.module.js'],['build/three.core.min.js','three.core.min.js'],['LICENSE','LICENSE.three.txt']])await copyFile(path.join(root,'node_modules/three',from),path.join(dest,to));
 await writeFile(path.join(dest,'version.json'),JSON.stringify({name:'three',version:pkg.version}));console.log('Three.js r180 installed locally. No runtime CDN requests.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))vendor().catch(e=>{console.error(e.message);process.exitCode=1;});
